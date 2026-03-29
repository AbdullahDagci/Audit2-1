import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocation, formatDistance } from '@/hooks/useLocation';
import { useInspectionStore } from '@/stores/inspection-store';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';

const facilityTypes = [
  { key: 'magaza', label: 'Magaza', icon: 'store' as const },
  { key: 'kesimhane', label: 'Kesimhane', icon: 'restaurant' as const },
  { key: 'ahir', label: 'Ahir', icon: 'pets' as const },
  { key: 'yufka', label: 'Yufka', icon: 'bakery-dining' as const },
  { key: 'depo', label: 'Depo', icon: 'warehouse' as const },
];

function calcDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function NewInspectionScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isInspector = user?.role === 'inspector';
  const [selectedType, setSelectedType] = useState('magaza');
  const [selectedBranch, setSelectedBranch] = useState<any>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [checking, setChecking] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date>(new Date(Date.now() + 86400000));
  const [loadingBranches, setLoadingBranches] = useState(true);
  const { getCurrentLocation } = useLocation();
  const { startInspection } = useInspectionStore();

  useEffect(() => {
    const fetchBranches = async () => {
      setLoadingBranches(true);
      try {
        const data = await api.getBranches(selectedType);
        setBranches(Array.isArray(data) ? data : []);
      } catch {
        setBranches([]);
      }
      setLoadingBranches(false);
    };
    fetchBranches();
    setSelectedBranch(null);
  }, [selectedType]);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const data = await api.getTemplates(selectedType);
        setTemplates(Array.isArray(data) ? data : []);
      } catch {
        setTemplates([]);
      }
    };
    fetchTemplates();
  }, [selectedType]);

  const getTemplate = () => templates.length > 0 ? templates[0] : null;

  // ===== DENETIM PLANLA (ileri tarih) =====
  const handleSchedule = async () => {
    if (!selectedBranch) return;
    const template = getTemplate();
    if (!template) {
      Alert.alert('Hata', 'Bu tesis tipi için denetim şablonu bulunamadı.');
      return;
    }

    setScheduling(true);
    try {
      await api.createInspection({
        branchId: selectedBranch.id,
        templateId: template.id,
        status: 'scheduled',
        scheduledDate: scheduledDate.toISOString().split('T')[0],
      });

      Alert.alert(
        'Denetim Planlandi',
        `${selectedBranch.name} için ${scheduledDate.toLocaleDateString('tr-TR')} tarihine denetim planlandi.`,
        [{ text: 'Tamam', onPress: () => router.back() }]
      );
    } catch (err: any) {
      Alert.alert('Hata', err.message || 'Denetim planlanirken bir hata oluştu.');
    }
    setScheduling(false);
  };

  // ===== DENETIME HEMEN BASLA (sadece denetci) =====
  const handleStartInspection = async () => {
    if (!selectedBranch || !isInspector) return;
    const template = getTemplate();
    if (!template) {
      Alert.alert('Hata', 'Bu tesis tipi için denetim şablonu bulunamadı.');
      return;
    }

    setChecking(true);
    const location = await getCurrentLocation();

    if (!location) {
      Alert.alert('Konum Alinamadi', 'Denetim başlatmak için konum izni vermeniz gerekir.');
      setChecking(false);
      return;
    }

    const distance = calcDistance(location.latitude, location.longitude, selectedBranch.latitude, selectedBranch.longitude);
    const isNear = distance <= (selectedBranch.geofenceRadiusMeters || 200);

    if (isNear) {
      doStart(selectedBranch, template, location.latitude, location.longitude, true);
    } else {
      Alert.alert(
        'Konum Doğrulanamadı',
        `${selectedBranch.name} subesine ${formatDistance(distance)} uzaktasınız.\n\nDenetim başlatmak için subenin yakınında olmanız gerekir.`,
        [{ text: 'Tamam' }]
      );
    }
    setChecking(false);
  };

  const doStart = async (branch: any, template: any, lat: number, lon: number, verified: boolean) => {
    try {
      const inspection = await api.createInspection({
        branchId: branch.id,
        templateId: template.id,
        status: 'in_progress',
        latitude: lat,
        longitude: lon,
        locationVerified: verified,
      });

      startInspection({
        inspectionId: inspection.id,
        branchId: branch.id,
        templateId: template.id,
        branchName: branch.name,
        templateName: template.name,
        latitude: lat,
        longitude: lon,
        locationVerified: verified,
      });

      router.push(`/inspection/${inspection.id}`);
    } catch (err: any) {
      Alert.alert('Hata', err.message || 'Denetim oluşturulurken bir hata oluştu.');
    }
  };

  const onDateChange = (_event: any, selected?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selected) setScheduledDate(selected);
  };

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  return (
    <View style={styles.container}>
      {/* Tesis tipi secimi */}
      <View style={styles.typeRow}>
        {facilityTypes.map((ft) => (
          <TouchableOpacity
            key={ft.key}
            style={[styles.typeChip, selectedType === ft.key && styles.typeChipOn]}
            onPress={() => { setSelectedType(ft.key); setSelectedBranch(null); }}
          >
            <MaterialIcons name={ft.icon} size={18} color={selectedType === ft.key ? '#FFF' : '#757575'} />
            <Text style={[styles.typeLabel, selectedType === ft.key && { color: '#FFF' }]}>{ft.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Sube listesi */}
      {loadingBranches ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color="#2E7D32" />
        </View>
      ) : (
        <FlatList
          data={branches}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isSelected = selectedBranch?.id === item.id;
            return (
              <TouchableOpacity
                style={[styles.branchCard, isSelected && styles.branchSelected]}
                onPress={() => setSelectedBranch(item)}
                activeOpacity={0.7}
              >
                <View style={styles.branchRow}>
                  <View style={styles.radioOuter}>
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.branchName}>{item.name}</Text>
                    <Text style={styles.branchAddr}>{item.address || item.city}</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={22} color="#BDBDBD" />
                </View>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>Bu tipte sube bulunamadı</Text>}
        />
      )}

      {/* Alt bar */}
      {selectedBranch && (
        <View style={styles.bottomBar}>
          <View style={styles.selectedInfo}>
            <MaterialIcons name="store" size={18} color="#2E7D32" />
            <Text style={styles.selectedName}>{selectedBranch.name}</Text>
          </View>

          {/* Tarih secici */}
          <TouchableOpacity style={styles.dateRow} onPress={() => setShowDatePicker(true)}>
            <MaterialIcons name="event" size={20} color="#1565C0" />
            <Text style={styles.dateLabel}>Planlanan tarih: </Text>
            <Text style={styles.dateValue}>{scheduledDate.toLocaleDateString('tr-TR')}</Text>
            <MaterialIcons name="edit" size={16} color="#1565C0" />
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={scheduledDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={tomorrow}
              onChange={onDateChange}
              locale="tr-TR"
            />
          )}
          {Platform.OS === 'ios' && showDatePicker && (
            <TouchableOpacity style={styles.dateConfirm} onPress={() => setShowDatePicker(false)}>
              <Text style={styles.dateConfirmText}>Tamam</Text>
            </TouchableOpacity>
          )}

          {/* Butonlar: Denetçi -> Planla + Başla, Admin/Manager -> sadece Planla */}
          {isInspector ? (
            <View style={styles.btnRow}>
              <TouchableOpacity
                style={styles.scheduleBtn}
                onPress={handleSchedule}
                disabled={scheduling}
                activeOpacity={0.8}
              >
                {scheduling ? (
                  <ActivityIndicator size="small" color="#1565C0" />
                ) : (
                  <>
                    <MaterialIcons name="schedule" size={22} color="#1565C0" />
                    <Text style={styles.scheduleBtnText}>Planla</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.startBtn}
                onPress={handleStartInspection}
                disabled={checking}
                activeOpacity={0.8}
              >
                {checking ? (
                  <>
                    <ActivityIndicator size="small" color="#FFF" />
                    <Text style={styles.startBtnText}>Kontrol...</Text>
                  </>
                ) : (
                  <>
                    <MaterialIcons name="play-arrow" size={24} color="#FFF" />
                    <Text style={styles.startBtnText}>Başla</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.scheduleBtnFull}
              onPress={handleSchedule}
              disabled={scheduling}
              activeOpacity={0.8}
            >
              {scheduling ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <MaterialIcons name="schedule" size={22} color="#FFF" />
                  <Text style={styles.scheduleBtnFullText}>Denetim Planla</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 16 },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0' },
  typeChipOn: { backgroundColor: '#2E7D32', borderColor: '#2E7D32' },
  typeLabel: { fontSize: 13, fontWeight: '600', color: '#757575' },
  list: { padding: 16, paddingTop: 0, paddingBottom: 260 },
  branchCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 2, borderColor: 'transparent', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  branchSelected: { borderColor: '#2E7D32', backgroundColor: '#F1F8E9' },
  branchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#BDBDBD', alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#2E7D32' },
  branchName: { fontSize: 16, fontWeight: '600', color: '#212121' },
  branchAddr: { fontSize: 13, color: '#757575', marginTop: 2 },
  empty: { textAlign: 'center', color: '#757575', marginTop: 40, fontSize: 15 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E0E0E0', padding: 16, paddingBottom: 32 },
  selectedInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  selectedName: { fontSize: 14, fontWeight: '600', color: '#2E7D32' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E3F2FD', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginBottom: 10 },
  dateLabel: { fontSize: 13, color: '#1565C0' },
  dateValue: { fontSize: 13, fontWeight: '700', color: '#1565C0', flex: 1 },
  dateConfirm: { alignSelf: 'flex-end', paddingVertical: 6, paddingHorizontal: 16, backgroundColor: '#E3F2FD', borderRadius: 8, marginBottom: 8 },
  dateConfirmText: { fontSize: 14, fontWeight: '600', color: '#1565C0' },
  btnRow: { flexDirection: 'row', gap: 10 },
  scheduleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#E3F2FD', borderRadius: 14, paddingVertical: 16, borderWidth: 1, borderColor: '#90CAF9' },
  scheduleBtnText: { fontSize: 16, fontWeight: '600', color: '#1565C0' },
  startBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#2E7D32', borderRadius: 14, paddingVertical: 16, shadowColor: '#2E7D32', shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  startBtnText: { fontSize: 16, fontWeight: '600', color: '#FFF' },
  scheduleBtnFull: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#2E7D32', borderRadius: 14, paddingVertical: 16, shadowColor: '#2E7D32', shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  scheduleBtnFullText: { fontSize: 17, fontWeight: '600', color: '#FFF' },
});
