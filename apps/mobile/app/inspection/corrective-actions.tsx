import React, { useState, useEffect, useCallback } from 'react';
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

const screenWidth = Dimensions.get('window').width;

export default function CorrectiveActionsScreen() {
  const router = useRouter();
  const { inspectionId } = useLocalSearchParams<{ inspectionId: string }>();
  const user = useAuthStore((s) => s.user);

  const [deficiencies, setDeficiencies] = useState<any[]>([]);
  const [correctiveActions, setCorrectiveActions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state - her deficiency icin ayri
  const [descriptions, setDescriptions] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});
  const [expandedOptional, setExpandedOptional] = useState<Record<string, boolean>>({});
  const [viewPhoto, setViewPhoto] = useState<string | null>(null);
  const [successItems, setSuccessItems] = useState<Record<string, boolean>>({});

  const photoUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${Config.API_URL}${path}`;
  };

  const fetchData = useCallback(async () => {
    if (!inspectionId) return;
    setLoading(true);
    setError(null);
    try {
      const [defs, actions] = await Promise.all([
        api.getDeficiencies(inspectionId).catch(() => []),
        api.getCorrectiveActions(inspectionId).catch(() => []),
      ]);
      setDeficiencies(Array.isArray(defs) ? defs : []);
      setCorrectiveActions(Array.isArray(actions) ? actions : []);
    } catch (err: any) {
      setError(err.message || 'Veriler yüklenemedi');
    }
    setLoading(false);
  }, [inspectionId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getActionForResponse = (responseId: string) => {
    return correctiveActions.find((a: any) => a.responseId === responseId);
  };

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

  const handleSubmit = async (deficiency: any) => {
    const responseId = deficiency.responseId;
    const description = descriptions[responseId]?.trim();

    if (!description) {
      Alert.alert('Uyarı', 'Düzeltici faaliyet açıklaması yazmanız gerekiyor.');
      return;
    }

    setSubmitting((prev) => ({ ...prev, [responseId]: true }));

    try {
      // Düzeltici faaliyet oluştur
      const action = await api.createCorrectiveAction({
        inspectionId: inspectionId!,
        responseId,
        description,
      });

      // Kanıt fotoğrafı varsa yükle
      if (photos[responseId]) {
        await api.uploadEvidence(action.id, photos[responseId]);
      }

      setSuccessItems((prev) => ({ ...prev, [responseId]: true }));

      // Listeyi yenile
      await fetchData();

      // Başarı geri bildirimi
      Alert.alert('Başarılı', 'Düzeltici faaliyet kaydedildi.');
    } catch (err: any) {
      Alert.alert('Hata', err.message || 'Düzeltici faaliyet kaydedilemedi.');
    }

    setSubmitting((prev) => ({ ...prev, [responseId]: false }));
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={{ color: '#999', marginTop: 12 }}>Yükleniyor...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <MaterialIcons name="error-outline" size={48} color="#F44336" />
        <Text style={{ color: '#F44336', marginTop: 12, fontSize: 15 }}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchData}>
          <Text style={{ color: '#FFF', fontWeight: '600' }}>Tekrar Dene</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Geri butonu */}
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <MaterialIcons name="arrow-back-ios" size={20} color="#2E7D32" />
        <Text style={styles.backText}>Geri</Text>
      </TouchableOpacity>

      {/* Baslik */}
      <View style={styles.headerCard}>
        <MaterialIcons name="build" size={28} color="#E65100" />
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Düzeltici Faaliyetler</Text>
          <Text style={styles.headerSub}>
            {deficiencies.length} eksiklik bulundu
            {correctiveActions.length > 0 && ` · ${correctiveActions.length} faaliyet kayıtlı`}
          </Text>
        </View>
      </View>

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
        const isOptionalExpanded = expandedOptional[responseId];
        const isSuccess = successItems[responseId];

        return (
          <View key={responseId} style={[styles.defCard, isCritical && styles.defCardCritical]}>
            {/* Soru basligi */}
            <View style={styles.defHeader}>
              <View style={{ flex: 1 }}>
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
                <Text style={styles.critBadgeText}>KRİTİK</Text>
              </View>
            )}

            {/* Denetçi notları */}
            {def.notes && (
              <View style={styles.notesBox}>
                <MaterialIcons name="note" size={14} color="#999" />
                <Text style={styles.notesText}>{def.notes}</Text>
              </View>
            )}

            {/* Mevcut düzeltici faaliyet varsa göster */}
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
                    <Text style={styles.evidenceText}>{existingAction.evidence.length} kanıt yüklendi</Text>

                    {existingAction.evidence.map((ev: any) => (
                      <TouchableOpacity key={ev.id} onPress={() => setViewPhoto(photoUrl(ev.storagePath || ev.photoUrl))}>
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
                    <Text style={[styles.evidenceText, { color: '#FF9800' }]}>Kanıt bekleniyor</Text>

                  </View>
                )}
              </View>
            ) : isSuccess ? (
              <View style={styles.successBox}>
                <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
                <Text style={styles.successText}>Başarıyla kaydedildi</Text>

              </View>
            ) : isCritical ? (
              /* Kritik - zorunlu form */
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Düzeltici faaliyet açıklaması (zorunlu)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Yapılacak düzeltici faaliyeti açıklayın..."
                  value={descriptions[responseId] || ''}
                  onChangeText={(t) => setDescriptions((prev) => ({ ...prev, [responseId]: t }))}
                  multiline
                />
                {/* Fotograf */}
                {photos[responseId] ? (
                  <View style={styles.photoPreview}>
                    <Image source={{ uri: photos[responseId] }} style={styles.photoPreviewImg} />
                    <TouchableOpacity style={styles.photoRemove} onPress={() => setPhotos((prev) => { const n = { ...prev }; delete n[responseId]; return n; })}>
                      <MaterialIcons name="close" size={18} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.photoBtn} onPress={() => showPhotoOptions(responseId)}>
                    <MaterialIcons name="add-a-photo" size={20} color="#2E7D32" />
                    <Text style={styles.photoBtnText}>Kanıt Fotoğrafı Ekle</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.submitBtn, submitting[responseId] && { opacity: 0.6 }]}
                  onPress={() => handleSubmit(def)}
                  disabled={submitting[responseId]}
                  activeOpacity={0.8}
                >
                  {submitting[responseId] ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <MaterialIcons name="save" size={18} color="#FFF" />
                      <Text style={styles.submitBtnText}>Kaydet</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              /* Kritik değil - opsiyonel, açılır kapanır */
              <View>
                <TouchableOpacity
                  style={styles.optionalToggle}
                  onPress={() => setExpandedOptional((prev) => ({ ...prev, [responseId]: !prev[responseId] }))}
                >
                  <MaterialIcons name={isOptionalExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={20} color="#2E7D32" />
                  <Text style={styles.optionalToggleText}>Düzeltici Faaliyet Ekle</Text>
                </TouchableOpacity>

                {isOptionalExpanded && (
                  <View style={styles.formSection}>
                    <TextInput
                      style={styles.formInput}
                      placeholder="Düzeltici faaliyet açıklaması..."
                      value={descriptions[responseId] || ''}
                      onChangeText={(t) => setDescriptions((prev) => ({ ...prev, [responseId]: t }))}
                      multiline
                    />
                    {photos[responseId] ? (
                      <View style={styles.photoPreview}>
                        <Image source={{ uri: photos[responseId] }} style={styles.photoPreviewImg} />
                        <TouchableOpacity style={styles.photoRemove} onPress={() => setPhotos((prev) => { const n = { ...prev }; delete n[responseId]; return n; })}>
                          <MaterialIcons name="close" size={18} color="#FFF" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity style={styles.photoBtn} onPress={() => showPhotoOptions(responseId)}>
                        <MaterialIcons name="add-a-photo" size={20} color="#2E7D32" />
                        <Text style={styles.photoBtnText}>Kanıt Fotoğrafı Ekle</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[styles.submitBtn, submitting[responseId] && { opacity: 0.6 }]}
                      onPress={() => handleSubmit(def)}
                      disabled={submitting[responseId]}
                      activeOpacity={0.8}
                    >
                      {submitting[responseId] ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <>
                          <MaterialIcons name="save" size={18} color="#FFF" />
                          <Text style={styles.submitBtnText}>Kaydet</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>
        );
      })}

      {/* Tam ekran fotoğraf görüntüleme */}
      <RNModal visible={!!viewPhoto} transparent animationType="fade" onRequestClose={() => setViewPhoto(null)}>
        <View style={styles.photoModal}>
          <TouchableOpacity style={styles.photoModalClose} onPress={() => setViewPhoto(null)}>
            <MaterialIcons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
          {viewPhoto && (
            <Image source={{ uri: viewPhoto }} style={styles.photoFull} resizeMode="contain" />
          )}
        </View>
      </RNModal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12, paddingVertical: 6 },
  backText: { fontSize: 16, fontWeight: '600', color: '#2E7D32' },
  headerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, padding: 16, gap: 14, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#212121' },
  headerSub: { fontSize: 13, color: '#757575', marginTop: 2 },
  retryBtn: { marginTop: 16, backgroundColor: '#2E7D32', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  emptyBox: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 16, color: '#999', marginTop: 12 },

  // Deficiency card
  defCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, borderLeftWidth: 4, borderLeftColor: '#FF9800' },
  defCardCritical: { borderLeftColor: '#F44336' },
  defHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  defCategory: { fontSize: 11, fontWeight: '600', color: '#999', textTransform: 'uppercase', marginBottom: 2 },
  defQuestion: { fontSize: 14, fontWeight: '600', color: '#333', lineHeight: 20 },
  defScoreBox: { backgroundColor: '#FFEBEE', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  defScore: { fontSize: 12, fontWeight: '700', color: '#F44336' },

  critBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFEBEE', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start', marginTop: 8 },
  critBadgeText: { fontSize: 10, fontWeight: '700', color: '#C62828' },

  notesBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 8, backgroundColor: '#FAFAFA', padding: 10, borderRadius: 8 },
  notesText: { flex: 1, fontSize: 12, color: '#666', fontStyle: 'italic' },

  // Existing corrective action
  existingAction: { marginTop: 12, backgroundColor: '#E8F5E9', borderRadius: 10, padding: 12 },
  existingHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  existingTitle: { fontSize: 13, fontWeight: '600', color: '#2E7D32' },
  existingDesc: { fontSize: 13, color: '#333', lineHeight: 18 },
  evidenceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  evidenceText: { fontSize: 12, color: '#4CAF50', fontWeight: '500' },
  evidenceThumb: { width: 48, height: 48, borderRadius: 8, backgroundColor: '#E0E0E0' },

  // Success
  successBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, backgroundColor: '#E8F5E9', borderRadius: 10, padding: 14 },
  successText: { fontSize: 14, fontWeight: '600', color: '#2E7D32' },

  // Form
  formSection: { marginTop: 12 },
  formLabel: { fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 6 },
  formInput: { backgroundColor: '#FAFAFA', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, padding: 12, fontSize: 14, minHeight: 70, textAlignVertical: 'top', marginBottom: 10 },
  photoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: '#2E7D32', borderStyle: 'dashed', borderRadius: 10, paddingVertical: 12, marginBottom: 10 },
  photoBtnText: { fontSize: 13, fontWeight: '600', color: '#2E7D32' },
  photoPreview: { position: 'relative', marginBottom: 10 },
  photoPreviewImg: { width: '100%', height: 160, borderRadius: 10, backgroundColor: '#F0F0F0' },
  photoRemove: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 14, padding: 4 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#2E7D32', borderRadius: 12, paddingVertical: 14 },
  submitBtnText: { fontSize: 15, fontWeight: '600', color: '#FFF' },

  // Optional toggle
  optionalToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10, paddingVertical: 8 },
  optionalToggleText: { fontSize: 13, fontWeight: '600', color: '#2E7D32' },

  // Photo modal
  photoModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  photoModalClose: { position: 'absolute', top: 60, right: 20, zIndex: 10, padding: 8 },
  photoFull: { width: screenWidth, height: screenWidth },
});
