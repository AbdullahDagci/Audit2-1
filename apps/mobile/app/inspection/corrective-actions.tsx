import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Image, Modal as RNModal, Dimensions
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { api } from '@/lib/api';
import { Config } from '@/constants/config';
import { useAuthStore } from '@/stores/auth-store';
import ToastMessage from 'react-native-toast-message';
import { haptic } from '@/lib/haptics';

const screenWidth = Dimensions.get('window').width;

export default function CorrectiveActionsScreen() {
  const router = useRouter();
  const { inspectionId } = useLocalSearchParams<{ inspectionId: string }>();
  const user = useAuthStore((s) => s.user);
  const canEdit = user?.role === 'manager';

  // Data state
  const [deficiencies, setDeficiencies] = useState<any[]>([]);
  const [correctiveActions, setCorrectiveActions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state - toplu kayit icin
  const [descriptions, setDescriptions] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<Record<string, string>>({});

  // Kaydetme state
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState('');

  // Fotoğraf görüntüleme
  const [viewPhoto, setViewPhoto] = useState<string | null>(null);

  // ---- Yardimci fonksiyonlar ----

  const photoUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${Config.API_URL}${path}`;
  };

  const getActionForResponse = useCallback((responseId: string) => {
    return correctiveActions.find((a: any) => a.responseId === responseId);
  }, [correctiveActions]);

  // ---- Ozet hesaplamalari ----

  const summary = useMemo(() => {
    const total = deficiencies.length;
    const critical = deficiencies.filter((d) => d.isCritical).length;
    const saved = deficiencies.filter((d) => getActionForResponse(d.responseId)).length;
    return { total, critical, saved };
  }, [deficiencies, getActionForResponse]);

  // Kaydedilmemis ve description dolmus eksiklikleri say
  const pendingActions = useMemo(() => {
    return deficiencies.filter((d) => {
      const hasExisting = !!getActionForResponse(d.responseId);
      if (hasExisting) return false;
      const desc = descriptions[d.responseId]?.trim();
      return !!desc;
    });
  }, [deficiencies, descriptions, getActionForResponse]);

  // ---- Veri yukleme ----

  const fetchData = useCallback(async () => {
    if (!inspectionId) return;
    setLoading(true);
    setError(null);
    try {
      const [defsResponse, actions] = await Promise.all([
        api.getDeficiencies(inspectionId).catch(() => ({ deficiencies: [] })),
        api.getCorrectiveActions(inspectionId).catch(() => []),
      ]);
      const defList = (defsResponse as any)?.deficiencies || (Array.isArray(defsResponse) ? defsResponse : []);
      setDeficiencies(defList);
      setCorrectiveActions(Array.isArray(actions) ? actions : []);
    } catch (err: any) {
      setError(err.message || 'Veriler yüklenemedi');
    }
    setLoading(false);
  }, [inspectionId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ---- Fotoğraf işlemleri ----

  const pickPhoto = async (responseId: string) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      setPhotos((prev) => ({ ...prev, [responseId]: result.assets[0].uri }));
    }
  };

  const takePhoto = async (responseId: string) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Kamera izni vermeniz gerekiyor.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      setPhotos((prev) => ({ ...prev, [responseId]: result.assets[0].uri }));
    }
  };

  const showPhotoOptions = (responseId: string) => {
    Alert.alert('Fotoğraf Seç', 'Fotoğraf kaynağı seçin', [
      { text: 'Kamera', onPress: () => takePhoto(responseId) },
      { text: 'Galeri', onPress: () => pickPhoto(responseId) },
      { text: 'İptal', style: 'cancel' },
    ]);
  };

  const removePhoto = (responseId: string) => {
    setPhotos((prev) => {
      const next = { ...prev };
      delete next[responseId];
      return next;
    });
  };

  // ---- TOPLU KAYIT ----

  const handleBatchSave = async () => {
    // Validasyon: Kritik olup description bos olanlari bul
    const unsavedCriticals = deficiencies.filter((d) => {
      if (!d.isCritical) return false;
      const hasExisting = !!getActionForResponse(d.responseId);
      if (hasExisting) return false;
      const desc = descriptions[d.responseId]?.trim();
      return !desc;
    });

    if (unsavedCriticals.length > 0) {
      const names = unsavedCriticals.map((d) => `- ${d.questionText}`).join('\n');
      Alert.alert(
        'Kritik Eksiklikler',
        `Aşağıdaki kritik eksiklikler için düzeltici faaliyet zorunludur:\n\n${names}`,
      );
      return;
    }

    if (pendingActions.length === 0) {
      ToastMessage.show({ type: 'info', text1: 'Uyari', text2: 'Kaydedilecek düzeltici faaliyet bulunamadı. Lütfen en az bir açıklama yazın.' });
      return;
    }

    setSaving(true);
    setSaveProgress(`0/${pendingActions.length} kaydediliyor...`);

    try {
      // 1. Toplu kayit: batch endpoint
      const batchPayload = pendingActions.map((d) => ({
        responseId: d.responseId,
        description: descriptions[d.responseId].trim(),
      }));

      setSaveProgress(`Faaliyetler kaydediliyor...`);
      const result = await api.batchCreateCorrectiveActions(inspectionId!, batchPayload);

      // 2. Fotoğrafları sıralıyla yükle
      const actionsWithPhotos = pendingActions.filter((d) => photos[d.responseId]);

      if (actionsWithPhotos.length > 0 && result.actions) {
        for (let i = 0; i < actionsWithPhotos.length; i++) {
          const def = actionsWithPhotos[i];
          const photoUri = photos[def.responseId];
          // batch response'dan ilgili action'i bul
          const createdAction = result.actions.find(
            (a: any) => a.responseId === def.responseId
          );

          if (createdAction && photoUri) {
            setSaveProgress(`Fotoğraf yükleniyor ${i + 1}/${actionsWithPhotos.length}...`);
            try {
              await api.uploadEvidence(createdAction.id, photoUri);
            } catch {
              // Fotoğraf yüklenemezse devam et, ama kullanıcıyı bilgilendir
              // (batch kayit basarili oldugundan kritik degil)
            }
          }
        }
      }

      // 3. Formu temizle ve veriyi yenile
      setDescriptions({});
      setPhotos({});
      await fetchData();

      setSaving(false);
      setSaveProgress('');

      haptic.success();
      ToastMessage.show({ type: 'success', text1: 'Basarili', text2: `${result.created} düzeltici faaliyet kaydedildi.` });
      setTimeout(() => router.back(), 1500);
    } catch (err: any) {
      setSaving(false);
      setSaveProgress('');
      haptic.error();
      ToastMessage.show({ type: 'error', text1: 'Hata', text2: err.message || 'Düzeltici faaliyetler kaydedilemedi.' });
    }
  };

  // ---- Render: Loading ----

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.loadingText}>Yukleniyor...</Text>
      </View>
    );
  }

  // ---- Render: Error ----

  if (error) {
    return (
      <View style={styles.center}>
        <MaterialIcons name="error-outline" size={48} color="#F44336" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchData}>
          <Text style={styles.retryBtnText}>Tekrar Dene</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ---- Render: Ana sayfa ----

  return (
    <View style={styles.container}>
      {/* Saving Overlay */}
      {saving && (
        <View style={styles.savingOverlay}>
          <View style={styles.savingBox}>
            <ActivityIndicator size="large" color="#2E7D32" />
            <Text style={styles.savingText}>{saveProgress}</Text>
          </View>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Geri butonu */}
        <TouchableOpacity style={styles.backBtn} onPress={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(tabs)');
          }
        }}>
          <MaterialIcons name="arrow-back-ios" size={20} color="#2E7D32" />
          <Text style={styles.backText}>Geri</Text>
        </TouchableOpacity>

        {/* Baslik karti */}
        <View style={styles.headerCard}>
          <View style={styles.headerIcon}>
            <MaterialIcons name="build" size={28} color="#E65100" />
          </View>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Düzeltici Faaliyetler</Text>
            <Text style={styles.headerSub}>
              {summary.total} eksiklik, {summary.critical} kritik, {summary.saved} kaydedildi
            </Text>
          </View>
        </View>

        {/* Ozet bar */}
        <View style={styles.summaryBar}>
          <View style={styles.summaryItem}>
            <MaterialIcons name="list-alt" size={18} color="#E65100" />
            <Text style={styles.summaryValue}>{summary.total}</Text>
            <Text style={styles.summaryLabel}>Eksiklik</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <MaterialIcons name="warning" size={18} color="#C62828" />
            <Text style={[styles.summaryValue, { color: '#C62828' }]}>{summary.critical}</Text>
            <Text style={styles.summaryLabel}>Kritik</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <MaterialIcons name="check-circle" size={18} color="#2E7D32" />
            <Text style={[styles.summaryValue, { color: '#2E7D32' }]}>{summary.saved}</Text>
            <Text style={styles.summaryLabel}>Kayıtlı</Text>
          </View>
        </View>

        {/* Eksiklik yoksa */}
        {deficiencies.length === 0 && (
          <View style={styles.emptyBox}>
            <MaterialIcons name="check-circle" size={48} color="#4CAF50" />
            <Text style={styles.emptyText}>Eksiklik bulunamadı</Text>
          </View>
        )}

        {/* Eksiklik Listesi */}
        {deficiencies.map((def: any) => {
          const existingAction = getActionForResponse(def.responseId);
          const isCritical = def.isCritical;
          const responseId = def.responseId;

          return (
            <View
              key={responseId}
              style={[
                styles.defCard,
                isCritical ? styles.defCardCritical : styles.defCardNormal,
              ]}
            >
              {/* Soru basligi */}
              <View style={styles.defHeader}>
                <View style={styles.defHeaderLeft}>
                  <Text style={styles.defCategory}>{def.categoryName}</Text>
                  <Text style={styles.defQuestion}>{def.questionText}</Text>
                </View>
                <View style={styles.defScoreBox}>
                  <Text style={styles.defScore}>{def.score ?? 0}/{def.maxScore}</Text>
                </View>
              </View>

              {/* Kritik badge */}
              {isCritical && (
                <View style={styles.critBadge}>
                  <MaterialIcons name="warning" size={14} color="#C62828" />
                  <Text style={styles.critBadgeText}>KRITIK</Text>
                </View>
              )}

              {/* Denetçi notları */}
              {def.notes && (
                <View style={styles.notesBox}>
                  <MaterialIcons name="note" size={14} color="#999" />
                  <Text style={styles.notesText}>{def.notes}</Text>
                </View>
              )}

              {/* Mevcut duzeltici faaliyet varsa: yesil kutu, duzenleme yok */}
              {existingAction ? (
                <View style={styles.existingAction}>
                  <View style={styles.existingHeader}>
                    <MaterialIcons name="check-circle" size={18} color="#2E7D32" />
                    <Text style={styles.existingTitle}>Düzeltici Faaliyet Kayıtlı</Text>
                  </View>
                  <Text style={styles.existingDesc}>{existingAction.description}</Text>
                  {existingAction.evidence && existingAction.evidence.length > 0 ? (
                    <View style={styles.evidenceRow}>
                      <MaterialIcons name="photo" size={16} color="#4CAF50" />
                      <Text style={styles.evidenceText}>
                        {existingAction.evidence.length} kanıt yüklendi
                      </Text>
                      {existingAction.evidence.map((ev: any) => (
                        <TouchableOpacity
                          key={ev.id}
                          onPress={() => setViewPhoto(photoUrl(ev.storagePath || ev.photoUrl))}
                        >
                          <Image
                            source={{ uri: photoUrl(ev.storagePath || ev.photoUrl) }}
                            style={styles.evidenceThumb}
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <View style={styles.evidenceRow}>
                      <MaterialIcons name="photo" size={16} color="#FF9800" />
                      <Text style={[styles.evidenceText, { color: '#FF9800' }]}>
                        Kanıt bekleniyor
                      </Text>
                    </View>
                  )}
                </View>
              ) : canEdit ? (
                /* Form: description + fotoğraf (sadece manager/admin) */
                <View style={styles.formSection}>
                  <Text style={styles.formLabel}>
                    {isCritical
                      ? 'Düzeltici faaliyet açıklaması (zorunlu)'
                      : 'Düzeltici faaliyet açıklaması'}
                  </Text>
                  <TextInput
                    style={[
                      styles.formInput,
                      isCritical && !descriptions[responseId]?.trim() && styles.formInputCriticalEmpty,
                    ]}
                    placeholder="Düzeltici faaliyet açıklaması..."
                    placeholderTextColor="#BDBDBD"
                    value={descriptions[responseId] || ''}
                    onChangeText={(t) =>
                      setDescriptions((prev) => ({ ...prev, [responseId]: t }))
                    }
                    multiline
                  />

                  {/* Fotoğraf */}
                  {photos[responseId] ? (
                    <View style={styles.photoPreview}>
                      <Image
                        source={{ uri: photos[responseId] }}
                        style={styles.photoPreviewImg}
                      />
                      <TouchableOpacity
                        style={styles.photoRemove}
                        onPress={() => removePhoto(responseId)}
                      >
                        <MaterialIcons name="close" size={18} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.photoBtn}
                      onPress={() => showPhotoOptions(responseId)}
                    >
                      <MaterialIcons name="add-a-photo" size={20} color="#2E7D32" />
                      <Text style={styles.photoBtnText}>Kanıt Fotoğrafı Ekle</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                /* Denetçi: düzeltici faaliyet henüz eklenmemiş bilgisi */
                <View style={styles.inspectorNote}>
                  <MaterialIcons name="hourglass-empty" size={16} color="#FF9800" />
                  <Text style={styles.inspectorNoteText}>
                    Şube sorumlusu tarafından düzeltici faaliyet bekleniyor
                  </Text>
                </View>
              )}
            </View>
          );
        })}

        {/* ScrollView altinda bosluk birak (sabit buton icin) */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Sabit "Hepsini Kaydet" butonu - sadece manager/admin */}
      {canEdit && deficiencies.length > 0 && summary.saved < summary.total && (
        <View style={styles.fixedBottom}>
          <TouchableOpacity
            style={[
              styles.batchSaveBtn,
              (pendingActions.length === 0 || saving) && styles.batchSaveBtnDisabled,
            ]}
            onPress={handleBatchSave}
            disabled={pendingActions.length === 0 || saving}
            activeOpacity={0.8}
          >
            <MaterialIcons name="save" size={20} color="#FFF" />
            <Text style={styles.batchSaveBtnText}>
              Hepsini Kaydet{pendingActions.length > 0 ? ` (${pendingActions.length} faaliyet)` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Tam ekran fotoğraf görüntüleme */}
      <RNModal
        visible={!!viewPhoto}
        transparent
        animationType="fade"
        onRequestClose={() => setViewPhoto(null)}
      >
        <View style={styles.photoModal}>
          <TouchableOpacity
            style={styles.photoModalClose}
            onPress={() => setViewPhoto(null)}
          >
            <MaterialIcons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
          {viewPhoto && (
            <Image
              source={{ uri: viewPhoto }}
              style={styles.photoFull}
              resizeMode="contain"
            />
          )}
        </View>
      </RNModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    color: '#999',
    marginTop: 12,
    fontSize: 14,
  },
  errorText: {
    color: '#F44336',
    marginTop: 12,
    fontSize: 15,
  },
  retryBtn: {
    marginTop: 16,
    backgroundColor: '#2E7D32',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryBtnText: {
    color: '#FFF',
    fontWeight: '600',
  },

  // Geri butonu
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
    paddingVertical: 6,
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
  },

  // Header kart
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    gap: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212121',
  },
  headerSub: {
    fontSize: 13,
    color: '#757575',
    marginTop: 2,
  },

  // Ozet bar
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
    gap: 2,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#E65100',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#999',
    fontWeight: '500',
  },
  summaryDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#E0E0E0',
  },

  // Empty
  emptyBox: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },

  // Deficiency card
  defCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 4,
  },
  defCardNormal: {
    borderLeftColor: '#FF9800',
  },
  defCardCritical: {
    borderLeftColor: '#F44336',
  },
  defHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  defHeaderLeft: {
    flex: 1,
  },
  defCategory: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  defQuestion: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    lineHeight: 20,
  },
  defScoreBox: {
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  defScore: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F44336',
  },

  // Kritik badge
  critBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  critBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#C62828',
  },

  // Notes
  notesBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 8,
    backgroundColor: '#FAFAFA',
    padding: 10,
    borderRadius: 8,
  },
  notesText: {
    flex: 1,
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },

  // Existing action (yesil kutu)
  existingAction: {
    marginTop: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
    padding: 12,
  },
  existingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  existingTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2E7D32',
  },
  existingDesc: {
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
  },
  evidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  evidenceText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  evidenceThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#E0E0E0',
  },

  // Inspector note
  inspectorNote: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 12, backgroundColor: '#FFF8E1', borderRadius: 10,
    padding: 12, borderWidth: 1, borderColor: '#FFE082',
  },
  inspectorNoteText: { fontSize: 13, color: '#F57F17', flex: 1 },

  // Form
  formSection: {
    marginTop: 12,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
  },
  formInput: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    minHeight: 70,
    textAlignVertical: 'top',
    marginBottom: 10,
    color: '#212121',
  },
  formInputCriticalEmpty: {
    borderColor: '#FFCDD2',
    backgroundColor: '#FFF8F8',
  },

  // Photo
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#2E7D32',
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 12,
    marginBottom: 4,
  },
  photoBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2E7D32',
  },
  photoPreview: {
    position: 'relative',
    marginBottom: 4,
  },
  photoPreviewImg: {
    width: '100%',
    height: 160,
    borderRadius: 10,
    backgroundColor: '#F0F0F0',
  },
  photoRemove: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 14,
    padding: 4,
  },

  // Bottom spacer (sabit buton icin alan)
  bottomSpacer: {
    height: 80,
  },

  // Sabit alt buton
  fixedBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  batchSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2E7D32',
    borderRadius: 14,
    paddingVertical: 16,
  },
  batchSaveBtnDisabled: {
    backgroundColor: '#A5D6A7',
  },
  batchSaveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },

  // Saving overlay
  savingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  savingBox: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 16,
    marginHorizontal: 40,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  savingText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },

  // Photo modal
  photoModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalClose: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  photoFull: {
    width: screenWidth,
    height: screenWidth,
  },
});
