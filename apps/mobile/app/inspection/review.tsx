import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Image, Modal as RNModal, Dimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import { Config } from '@/constants/config';
import { formatScore } from '@/lib/scoring';
import { useAuthStore } from '@/stores/auth-store';
import { useInspectionStore } from '@/stores/inspection-store';
import { useLocation, formatDistance } from '@/hooks/useLocation';

const screenWidth = Dimensions.get('window').width;

function getColor(p: number) {
  if (p >= 75) return '#4CAF50';
  if (p >= 50) return '#FF9800';
  return '#F44336';
}

function calcDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function statusLabel(s: string) {
  switch (s) {
    case 'scheduled': return { text: 'Planlanmış', bg: '#E3F2FD', color: '#1565C0' };
    case 'completed': return { text: 'Gönderildi', bg: '#FFF3E0', color: '#E65100' };
    case 'pending_action': return { text: 'İşlem Bekliyor', bg: '#FFF3E0', color: '#E65100' };
    case 'reviewed': return { text: 'Tamamlandı', bg: '#E8F5E9', color: '#2E7D32' };
    case 'in_progress': return { text: 'Devam Ediyor', bg: '#E3F2FD', color: '#1565C0' };
    case 'draft': return { text: 'Taslak', bg: '#F5F5F5', color: '#666' };
    default: return { text: s, bg: '#F5F5F5', color: '#666' };
  }
}

export default function InspectionReviewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);

  const { startInspection } = useInspectionStore();
  const { getCurrentLocation } = useLocation();

  const [inspection, setInspection] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [viewPhoto, setViewPhoto] = useState<string | null>(null);
  const [correctiveActions, setCorrectiveActions] = useState<any[]>([]);

  const photoUrl = (path: string) => {
    if (path.startsWith('http')) return path;
    return `${Config.API_URL}${path}`;
  };

  useEffect(() => {
    if (id) fetchInspection();
  }, [id]);

  const fetchInspection = async () => {
    setLoading(true);
    try {
      const data = await api.getInspection(id!);
      setInspection(data);
      // Düzeltici faaliyetleri de çek
      try {
        const actions = await api.getCorrectiveActions(id!);
        setCorrectiveActions(Array.isArray(actions) ? actions : []);
      } catch {
        setCorrectiveActions([]);
      }
    } catch (err: any) {
      Alert.alert('Hata', err.message);
    }
    setLoading(false);
  };

  // Planlanan denetimi başlat (sadece denetçi)
  const handleStartScheduled = async () => {
    if (!inspection) return;

    // Tarih kontrolu
    if (inspection.scheduledDate) {
      const scheduled = new Date(inspection.scheduledDate);
      scheduled.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dateStr = scheduled.toLocaleDateString('tr-TR');
      if (today < scheduled) {
        Alert.alert('Erken Başlatılamaz', `Bu denetim ${dateStr} tarihine planlanmıştır. Planlanan tarihten önce başlatılamaz.`);
        return;
      }
      if (today > scheduled) {
        Alert.alert('Süresi Geçmiş', `Bu denetimin tarihi (${dateStr}) geçmiştir. Denetim artık başlatılamaz.`);
        return;
      }
    }

    setStarting(true);

    const location = await getCurrentLocation();
    const branchLat = inspection.branch?.latitude;
    const branchLon = inspection.branch?.longitude;

    let verified = false;
    let lat = location?.latitude ?? null;
    let lon = location?.longitude ?? null;

    if (!location) {
      Alert.alert('Konum Alınamadı', 'Denetim başlatmak için konum izni vermeniz gerekir.');
      setStarting(false);
      return;
    }

    if (branchLat && branchLon) {
      const distance = calcDistance(location.latitude, location.longitude, branchLat, branchLon);
      const radius = inspection.branch?.geofenceRadiusMeters || 200;
      verified = distance <= radius;

      if (!verified) {
        Alert.alert('Konum Doğrulanamadı', `Şubeye ${formatDistance(distance)} uzaktasınız. Denetim başlatmak için şubenin yakınında olmanız gerekir.`);
        setStarting(false);
        return;
      }
    }

    try {
      // DB'de durumu güncelle
      await api.updateInspection(inspection.id, {
        status: 'in_progress',
        latitude: lat,
        longitude: lon,
        locationVerified: verified,
      });

      // Yerel state'i ayarla
      startInspection({
        inspectionId: inspection.id,
        branchId: inspection.branchId,
        templateId: inspection.templateId,
        branchName: inspection.branch?.name || '',
        templateName: inspection.template?.name || '',
        latitude: lat ?? undefined,
        longitude: lon ?? undefined,
        locationVerified: verified,
      });

      router.push(`/inspection/${inspection.id}`);
    } catch (err: any) {
      Alert.alert('Hata', err.message);
    }
    setStarting(false);
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2E7D32" /></View>;
  }

  if (!inspection) {
    return <View style={styles.center}><Text style={{ color: '#999' }}>Denetim bulunamadı</Text></View>;

  }

  const score = Number(inspection.scorePercentage || 0);
  const status = statusLabel(inspection.status);
  const isManager = user?.role === 'admin' || user?.role === 'manager';
  const isInspector = user?.role === 'inspector';
  const showCorrectiveBtn = isManager && (inspection.status === 'completed' || inspection.status === 'pending_action');
  const showEvidenceBtn = isInspector && correctiveActions.length > 0;

  // Tarih kontrolu
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let isExpired = false;
  let isEarly = false;
  if (inspection.scheduledDate) {
    const scheduled = new Date(inspection.scheduledDate); scheduled.setHours(0, 0, 0, 0);
    isExpired = today > scheduled;
    isEarly = today < scheduled;
  }

  const canStart = (inspection.status === 'scheduled' || inspection.status === 'draft')
    && user?.role === 'inspector'
    && inspection.inspectorId === user?.id
    && !isExpired
    && !isEarly;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Geri butonu */}
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <MaterialIcons name="arrow-back-ios" size={20} color="#2E7D32" />
        <Text style={styles.backText}>Geri</Text>
      </TouchableOpacity>

      {/* Header */}
      <View style={styles.headerCard}>
        <View style={styles.scoreCircle}>
          <Text style={[styles.scoreNum, { color: getColor(score) }]}>{formatScore(score)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.branchName}>{inspection.branch?.name}</Text>
          <Text style={styles.meta}>{inspection.template?.name}</Text>
          <Text style={styles.meta}>Denetçi: {inspection.inspector?.fullName}</Text>
          <Text style={styles.meta}>{new Date(inspection.completedAt || inspection.createdAt).toLocaleDateString('tr-TR')}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
          <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
        </View>
      </View>

      {/* Konum */}
      <View style={styles.infoRow}>
        <MaterialIcons name="location-on" size={18} color={inspection.locationVerified ? '#4CAF50' : '#FF9800'} />
        <Text style={styles.infoText}>Konum {inspection.locationVerified ? 'doğrulandı' : 'doğrulanamadı'}</Text>
      </View>

      {/* Onaylayan bilgisi */}
      {inspection.reviewedBy && (
        <View style={[styles.infoRow, { backgroundColor: '#E8F5E9', padding: 12, borderRadius: 10 }]}>
          <MaterialIcons name="verified" size={18} color="#2E7D32" />
          <View>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#2E7D32' }}>Onaylayan: {inspection.reviewedBy.fullName || 'Yönetici'}</Text>
            {inspection.reviewerNotes && <Text style={{ fontSize: 12, color: '#666' }}>Not: {inspection.reviewerNotes}</Text>}
          </View>
        </View>
      )}

      {/* Detayli Maddeler */}
      <Text style={styles.sectionTitle}>Denetim Detayları</Text>
      {inspection.template?.categories?.sort((a: any, b: any) => a.sortOrder - b.sortOrder).map((cat: any) => {
        const catResponses = inspection.responses?.filter((r: any) => cat.items.some((i: any) => i.id === r.checklistItemId)) || [];
        const catPassed = catResponses.filter((r: any) => r.passed === true).length;
        const isOpen = expandedCat === cat.id;

        return (
          <View key={cat.id} style={styles.catCard}>
            <TouchableOpacity style={styles.catHeader} onPress={() => setExpandedCat(isOpen ? null : cat.id)}>
              <MaterialIcons name={isOpen ? 'keyboard-arrow-down' : 'keyboard-arrow-right'} size={22} color="#333" />
              <Text style={styles.catName}>{cat.name}</Text>
              <Text style={styles.catScore}>{catPassed}/{cat.items.length}</Text>
            </TouchableOpacity>

            {isOpen && cat.items.sort((a: any, b: any) => a.sortOrder - b.sortOrder).map((item: any, idx: number) => {
              const resp = inspection.responses?.find((r: any) => r.checklistItemId === item.id);
              const passed = resp?.passed;
              const respPhotos = resp?.photos || [];
              return (
                <View key={item.id} style={styles.itemRow}>
                  <MaterialIcons
                    name={passed === true ? 'check-circle' : passed === false ? 'cancel' : 'radio-button-unchecked'}
                    size={20}
                    color={passed === true ? '#4CAF50' : passed === false ? '#F44336' : '#BDBDBD'}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemText}>{idx + 1}. {item.questionText}</Text>
                    {item.isCritical && <View style={styles.critTag}><Text style={styles.critTagText}>KRITIK</Text></View>}
                    {resp?.notes && <Text style={styles.noteText}>Not: {resp.notes}</Text>}
                    {respPhotos.length > 0 && (
                      <View style={styles.photoGrid}>
                        {respPhotos.map((p: any) => (
                          <TouchableOpacity key={p.id} onPress={() => setViewPhoto(photoUrl(p.storagePath))}>
                            <Image source={{ uri: photoUrl(p.storagePath) }} style={styles.photoThumb} />
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                  <Text style={[styles.itemScore, { color: passed === true ? '#4CAF50' : passed === false ? '#F44336' : '#999' }]}>
                    {resp?.score ?? 0}/{item.maxScore}
                  </Text>
                </View>
              );
            })}
          </View>
        );
      })}

      {/* Süresi geçmiş uyarısı */}
      {isExpired && (inspection.status === 'scheduled' || inspection.status === 'draft') && (
        <View style={styles.expiredBanner}>
          <MaterialIcons name="event-busy" size={22} color="#C62828" />
          <Text style={styles.expiredText}>Bu denetimin süresi geçmiştir. Artık başlatılamaz ve devam ettirilemez.</Text>
        </View>
      )}

      {/* Erken uyarısı */}
      {isEarly && (inspection.status === 'scheduled' || inspection.status === 'draft') && (
        <View style={styles.earlyBanner}>
          <MaterialIcons name="schedule" size={22} color="#1565C0" />
          <Text style={styles.earlyText}>Bu denetim {new Date(inspection.scheduledDate).toLocaleDateString('tr-TR')} tarihine planlanmıştır. O tarihte başlayabilirsiniz.</Text>
        </View>
      )}

      {/* Denetime Başla (planlanan denetim için) */}
      {canStart && (
        <View style={styles.startSection}>
          <View style={styles.startInfo}>
            <MaterialIcons name="event" size={20} color="#1565C0" />
            <Text style={styles.startInfoText}>
              Bu denetim {inspection.scheduledDate ? new Date(inspection.scheduledDate).toLocaleDateString('tr-TR') : ''} tarihine planlanmış.
            </Text>
          </View>
          <TouchableOpacity style={styles.startBtn} onPress={handleStartScheduled} disabled={starting} activeOpacity={0.8}>
            {starting ? (
              <>
                <ActivityIndicator size="small" color="#FFF" />
                <Text style={styles.startBtnText}>Konum kontrol ediliyor...</Text>
              </>
            ) : (
              <>
                <MaterialIcons name="play-arrow" size={24} color="#FFF" />
                <Text style={styles.startBtnText}>Denetime Başla</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Düzeltici Faaliyetler - Müdür/Admin */}
      {showCorrectiveBtn && (
        <View style={styles.approvalSection}>
          <TouchableOpacity
            style={styles.correctiveBtn}
            onPress={() => router.push(`/inspection/corrective-actions?inspectionId=${id}`)}
            activeOpacity={0.8}
          >
            <MaterialIcons name="build" size={22} color="#FFF" />
            <Text style={styles.btnText}>Düzeltici Faaliyetler</Text>
            {correctiveActions.length > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{correctiveActions.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Kanıtları Gör - Denetçi */}
      {showEvidenceBtn && (
        <View style={styles.approvalSection}>
          <TouchableOpacity
            style={styles.evidenceBtn}
            onPress={() => router.push(`/inspection/corrective-actions?inspectionId=${id}`)}
            activeOpacity={0.8}
          >
            <MaterialIcons name="photo-library" size={22} color="#FFF" />
            <Text style={styles.btnText}>Kanıtları Gör</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Tamamlandı */}
      {inspection.status === 'reviewed' && (
        <View style={styles.approvedBanner}>
          <MaterialIcons name="verified" size={24} color="#2E7D32" />
          <Text style={styles.approvedText}>Tamamlandı</Text>

        </View>
      )}

      {/* Genel Fotoğraflar */}
      {inspection.photos && inspection.photos.length > 0 && (
        <View style={{ marginTop: 16 }}>
          <Text style={styles.sectionTitle}>Fotoğraflar ({inspection.photos.length})</Text>
          <View style={styles.photoGrid}>
            {inspection.photos.map((p: any) => (
              <TouchableOpacity key={p.id} onPress={() => setViewPhoto(photoUrl(p.storagePath))}>
                <Image source={{ uri: photoUrl(p.storagePath) }} style={styles.photoLarge} />
                {p.caption && <Text style={styles.photoCaption}>{p.caption}</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12, paddingVertical: 6 },
  backText: { fontSize: 16, fontWeight: '600', color: '#2E7D32' },
  headerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, padding: 16, gap: 14, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  scoreCircle: { width: 70, height: 70, borderRadius: 35, borderWidth: 3, justifyContent: 'center', alignItems: 'center', borderColor: '#E0E0E0' },
  scoreNum: { fontSize: 26, fontWeight: '800' },
  branchName: { fontSize: 17, fontWeight: '700', color: '#212121' },
  meta: { fontSize: 13, color: '#757575', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, position: 'absolute', top: 12, right: 12 },
  statusText: { fontSize: 11, fontWeight: '700' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  infoText: { fontSize: 13, color: '#333' },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#212121', marginTop: 16, marginBottom: 10 },
  catCard: { backgroundColor: '#FFF', borderRadius: 10, marginBottom: 8, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 2, elevation: 1 },
  catHeader: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 6, backgroundColor: '#FAFAFA' },
  catName: { flex: 1, fontSize: 14, fontWeight: '600', color: '#333' },
  catScore: { fontSize: 13, fontWeight: '600', color: '#666' },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F5F5F5' },
  itemText: { fontSize: 13, color: '#333', lineHeight: 20 },
  itemScore: { fontSize: 12, fontWeight: '600', minWidth: 36, textAlign: 'right' },
  critTag: { backgroundColor: '#FFF3E0', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, alignSelf: 'flex-start', marginTop: 2 },
  critTagText: { fontSize: 9, fontWeight: '700', color: '#E65100' },
  noteText: { fontSize: 11, color: '#999', fontStyle: 'italic', marginTop: 2 },
  approvalSection: { marginTop: 8 },
  correctiveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#E65100', borderRadius: 14, paddingVertical: 16, shadowColor: '#E65100', shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  evidenceBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#1565C0', borderRadius: 14, paddingVertical: 16, shadowColor: '#1565C0', shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  countBadge: { backgroundColor: '#FFF', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 4 },
  countBadgeText: { fontSize: 12, fontWeight: '700', color: '#E65100' },
  btnText: { fontSize: 16, fontWeight: '600', color: '#FFF' },
  approvedBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#E8F5E9', borderRadius: 12, padding: 16, marginTop: 16 },
  approvedText: { fontSize: 16, fontWeight: '600', color: '#2E7D32' },
  expiredBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFEBEE', borderWidth: 1, borderColor: '#FFCDD2', borderRadius: 12, padding: 14, marginTop: 12 },
  expiredText: { flex: 1, fontSize: 13, color: '#C62828', fontWeight: '500' },
  earlyBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#E3F2FD', borderWidth: 1, borderColor: '#BBDEFB', borderRadius: 12, padding: 14, marginTop: 12 },
  earlyText: { flex: 1, fontSize: 13, color: '#1565C0', fontWeight: '500' },
  startSection: { marginTop: 12 },
  startInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#E3F2FD', padding: 12, borderRadius: 10, marginBottom: 12 },
  startInfoText: { flex: 1, fontSize: 13, color: '#1565C0' },
  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#2E7D32', borderRadius: 14, paddingVertical: 16, shadowColor: '#2E7D32', shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  startBtnText: { fontSize: 17, fontWeight: '600', color: '#FFF' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  photoThumb: { width: 64, height: 64, borderRadius: 8, backgroundColor: '#F0F0F0' },
  photoLarge: { width: 100, height: 100, borderRadius: 10, backgroundColor: '#F0F0F0' },
  photoCaption: { fontSize: 11, color: '#666', marginTop: 2, maxWidth: 100 },
  photoModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  photoModalClose: { position: 'absolute', top: 60, right: 20, zIndex: 10, padding: 8 },
  photoFull: { width: screenWidth, height: screenWidth },
});
