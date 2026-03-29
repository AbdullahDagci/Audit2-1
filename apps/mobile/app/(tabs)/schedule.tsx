import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, SectionList, StyleSheet, RefreshControl, ActivityIndicator, TouchableOpacity, Modal as RNModal, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';

interface AgendaItem {
  id: string;
  type: 'schedule' | 'inspection';
  branchName: string;
  templateName: string;
  inspectorName: string;
  facilityType: string;
  date: string;
  daysLeft: number;
  status: string;
}

function formatTR(dateStr: string) {
  const d = new Date(dateStr);
  const days = ['Pazar', 'Pazartesi', 'Sali', 'Carsamba', 'Persembe', 'Cuma', 'Cumartesi'];
  const months = ['Ocak', 'Subat', 'Mart', 'Nisan', 'Mayis', 'Haziran', 'Temmuz', 'Agustos', 'Eylul', 'Ekim', 'Kasim', 'Aralik'];
  return { day: d.getDate(), dayName: days[d.getDay()], month: months[d.getMonth()], year: d.getFullYear(), full: d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear() };
}

export default function ScheduleScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  const [items, setItems] = useState<AgendaItem[]>([]);
  const [facilityTypes, setFacilityTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedType, setSelectedType] = useState('all');
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());

  const fetchData = useCallback(async () => {
    try {
      // Tesis tiplerini cek
      try {
        const ft = await api.getFacilityTypes();
        setFacilityTypes(ft.filter((t: any) => t.is_active));
      } catch {}

      const allItems: AgendaItem[] = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 1. Tum denetimleri cek
      try {
        const params: Record<string, string> = {};
        if (selectedType !== 'all') params.facilityType = selectedType;
        const result = await api.getInspections(params);
        (result.data || []).forEach((i: any) => {
          const rawDate = i.scheduledDate || i.completedAt || i.startedAt || i.createdAt || '';
          const date = rawDate.split('T')[0];
          if (!date) return;
          const d = new Date(date);
          const diff = Math.ceil((d.getTime() - today.getTime()) / 86400000);
          allItems.push({
            id: i.id,
            type: 'inspection',
            branchName: i.branch?.name || 'Şube',
            templateName: i.template?.name || '',
            inspectorName: i.inspector?.fullName || '',
            facilityType: i.branch?.facilityType || '',
            date,
            daysLeft: diff,
            status: i.status,
          });
        });
      } catch {}

      // 2. Denetim takvimlerini cek
      try {
        const schedules = await api.getSchedules();
        schedules.forEach((s: any) => {
          const date = (s.nextDueDate || '').split('T')[0];
          const d = new Date(date);
          const diff = Math.ceil((d.getTime() - today.getTime()) / 86400000);
          // Filtre
          if (selectedType !== 'all' && s.branch?.facilityType !== selectedType) return;
          allItems.push({
            id: 's-' + s.id,
            type: 'schedule',
            branchName: s.branch?.name || 'Şube',
            templateName: s.template?.name || '',
            inspectorName: s.inspector?.fullName || 'Atanmamış',
            facilityType: s.branch?.facilityType || '',
            date,
            daysLeft: diff,
            status: diff < 0 ? 'overdue' : 'upcoming',
          });
        });
      } catch {}

      // Tarih filtresi
      let filtered = allItems;
      if (startDate) {
        const s = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime();
        filtered = filtered.filter(i => new Date(i.date).getTime() >= s);
      }
      if (endDate) {
        const e = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()).getTime();
        filtered = filtered.filter(i => new Date(i.date).getTime() <= e);
      }

      // Tarihe gore sirala
      filtered.sort((a, b) => a.date.localeCompare(b.date));
      setItems(filtered);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, [selectedType, startDate, endDate]);

  useEffect(() => { setLoading(true); fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const selectedTypeLabel = selectedType === 'all' ? 'Tum Tipler' : facilityTypes.find((t: any) => t.key === selectedType)?.label || selectedType;
  const hasFilter = selectedType !== 'all' || startDate || endDate;
  const formatD = (d: Date) => d.toLocaleDateString('tr-TR');
  const clearFilters = () => { setSelectedType('all'); setStartDate(null); setEndDate(null); };

  // Tarihe gore grupla (section list)
  const groupedByDate: Record<string, AgendaItem[]> = {};
  items.forEach(item => {
    if (!groupedByDate[item.date]) groupedByDate[item.date] = [];
    groupedByDate[item.date].push(item);
  });

  const sections = Object.entries(groupedByDate).map(([date, data]) => ({
    title: date,
    data,
  }));

  if (loading) {
    return <View style={S.center}><ActivityIndicator size="large" color="#2E7D32" /></View>;
  }

  return (
    <View style={S.container}>
      {/* Filtre alani */}
      <View style={S.filterRow}>
        {isAdmin && (
          <TouchableOpacity style={S.filterBox} onPress={() => setShowTypePicker(true)}>
            <MaterialIcons name="category" size={16} color="#2E7D32" />
            <Text style={S.filterText} numberOfLines={1}>{selectedTypeLabel}</Text>
            <MaterialIcons name="keyboard-arrow-down" size={18} color="#999" />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[S.dateBtn, startDate && S.dateBtnActive]} onPress={() => { setTempDate(startDate || new Date()); setShowStartPicker(true); }}>
          <MaterialIcons name="event" size={14} color={startDate ? '#FFF' : '#1565C0'} />
          <Text style={[S.dateBtnText, startDate && { color: '#FFF' }]}>{startDate ? formatD(startDate) : 'Başlangic'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[S.dateBtn, endDate && S.dateBtnActive]} onPress={() => { setTempDate(endDate || new Date()); setShowEndPicker(true); }}>
          <MaterialIcons name="event" size={14} color={endDate ? '#FFF' : '#1565C0'} />
          <Text style={[S.dateBtnText, endDate && { color: '#FFF' }]}>{endDate ? formatD(endDate) : 'Bitis'}</Text>
        </TouchableOpacity>
        {hasFilter && (
          <TouchableOpacity style={S.clearBtn} onPress={clearFilters}>
            <MaterialIcons name="close" size={16} color="#F44336" />
          </TouchableOpacity>
        )}
      </View>
      <Text style={S.resultCount}>{items.length} kayit</Text>

      {/* Date pickers */}
      {showStartPicker && (
        <>
          <DateTimePicker value={tempDate} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_e, d) => { if (Platform.OS === 'android') { setShowStartPicker(false); if (d) setStartDate(d); } else { if (d) setTempDate(d); } }} locale="tr-TR" />
          {Platform.OS === 'ios' && (
            <View style={S.pickerBtns}>
              <TouchableOpacity onPress={() => setShowStartPicker(false)} style={S.pickerCancel}><Text style={S.pickerCancelText}>İptal</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => { setStartDate(tempDate); setShowStartPicker(false); }} style={S.pickerDone}><Text style={S.pickerDoneText}>Uygula</Text></TouchableOpacity>
            </View>
          )}
        </>
      )}
      {showEndPicker && (
        <>
          <DateTimePicker value={tempDate} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_e, d) => { if (Platform.OS === 'android') { setShowEndPicker(false); if (d) setEndDate(d); } else { if (d) setTempDate(d); } }} locale="tr-TR" />
          {Platform.OS === 'ios' && (
            <View style={S.pickerBtns}>
              <TouchableOpacity onPress={() => setShowEndPicker(false)} style={S.pickerCancel}><Text style={S.pickerCancelText}>İptal</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => { setEndDate(tempDate); setShowEndPicker(false); }} style={S.pickerDone}><Text style={S.pickerDoneText}>Uygula</Text></TouchableOpacity>
            </View>
          )}
        </>
      )}

      {/* Filtre picker */}
      <RNModal visible={showTypePicker} transparent animationType="fade" onRequestClose={() => setShowTypePicker(false)}>
        <TouchableOpacity style={S.pickerOverlay} activeOpacity={1} onPress={() => setShowTypePicker(false)}>
          <View style={S.pickerCard}>
            <Text style={S.pickerTitle}>Tesis Tipi Secin</Text>
            <TouchableOpacity style={[S.pickerItem, selectedType === 'all' && S.pickerItemOn]} onPress={() => { setSelectedType('all'); setShowTypePicker(false); }}>
              <Text style={[S.pickerItemText, selectedType === 'all' && S.pickerItemTextOn]}>Tum Tipler</Text>
              {selectedType === 'all' && <MaterialIcons name="check" size={20} color="#2E7D32" />}
            </TouchableOpacity>
            {facilityTypes.map((t: any) => (
              <TouchableOpacity key={t.key} style={[S.pickerItem, selectedType === t.key && S.pickerItemOn]} onPress={() => { setSelectedType(t.key); setShowTypePicker(false); }}>
                <Text style={[S.pickerItemText, selectedType === t.key && S.pickerItemTextOn]}>{t.label}</Text>
                {selectedType === t.key && <MaterialIcons name="check" size={20} color="#2E7D32" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </RNModal>

      {/* Ajanda listesi */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2E7D32']} tintColor="#2E7D32" />}
        stickySectionHeadersEnabled
        renderSectionHeader={({ section }) => {
          const f = formatTR(section.title);
          const isToday = section.title === new Date().toISOString().split('T')[0];
          return (
            <View style={[S.dateHeader, isToday && S.dateHeaderToday]}>
              <View style={[S.dateCircle, isToday && S.dateCircleToday]}>
                <Text style={[S.dateDay, isToday && { color: '#FFF' }]}>{f.day}</Text>
              </View>
              <View>
                <Text style={[S.dateDayName, isToday && { color: '#2E7D32', fontWeight: '700' }]}>{f.dayName}</Text>
                <Text style={S.dateMonth}>{f.month} {f.year}</Text>
              </View>
              {isToday && <View style={S.todayBadge}><Text style={S.todayBadgeText}>BUGUN</Text></View>}
            </View>
          );
        }}
        renderItem={({ item }) => {
          let iconColor = '#999';
          let iconName = 'event' as any;
          let statusText = '';
          let statusVariant: 'success' | 'warning' | 'danger' | 'info' | 'neutral' = 'neutral';

          switch (item.status) {
            case 'scheduled':
              iconColor = '#1565C0'; iconName = 'schedule'; statusText = 'Planlanmış'; statusVariant = 'info'; break;
            case 'in_progress':
              iconColor = '#FF9800'; iconName = 'play-circle-outline'; statusText = 'Devam Ediyor'; statusVariant = 'warning'; break;
            case 'completed':
              iconColor = '#E65100'; iconName = 'pending-actions'; statusText = 'Onay Bekliyor'; statusVariant = 'warning'; break;
            case 'reviewed':
              iconColor = '#2E7D32'; iconName = 'check-circle'; statusText = 'Onaylandı'; statusVariant = 'success'; break;
            case 'overdue':
              iconColor = '#F44336'; iconName = 'warning'; statusText = 'Gecikti'; statusVariant = 'danger'; break;
            default:
              iconColor = '#999'; iconName = 'event'; statusText = item.status; break;
          }

          return (
            <TouchableOpacity
              style={S.agendaItem}
              onPress={() => {
                if (item.type === 'inspection') {
                  if (item.status === 'in_progress') {
                    router.push(`/inspection/${item.id}`);
                  } else {
                    router.push(`/inspection/review?id=${item.id}`);
                  }
                }
              }}
              activeOpacity={item.type === 'inspection' ? 0.7 : 1}
            >
              <View style={[S.agendaLine, { backgroundColor: iconColor }]} />
              <View style={[S.agendaIcon, { backgroundColor: iconColor + '15' }]}>
                <MaterialIcons name={iconName} size={20} color={iconColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={S.agendaBranch}>{item.branchName}</Text>
                <Text style={S.agendaTemplate}>{item.templateName}</Text>
                {isAdmin && item.inspectorName ? <Text style={S.agendaInspector}>{item.inspectorName}</Text> : null}
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Badge text={statusText} variant={statusVariant} />
                {item.type === 'schedule' && <Badge text="Periyodik" variant="neutral" />}
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={S.emptyBox}>
            <MaterialIcons name="event-available" size={48} color="#E0E0E0" />
            <Text style={S.emptyText}>Planlanmış denetim yok</Text>
            <Text style={S.emptyHint}>
              {isAdmin ? 'Yönetim sekmesinden denetim planı oluşturabilirsiniz' : 'Yöneticiniz tarafından denetim planlanmamış'}
            </Text>
          </View>
        }
        contentContainerStyle={items.length === 0 ? { flex: 1 } : { paddingBottom: 40 }}
      />
    </View>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' },

  // Filtre
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  filterBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10 },
  filterText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#333' },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 10 },
  dateBtnActive: { backgroundColor: '#1565C0', borderColor: '#1565C0' },
  dateBtnText: { fontSize: 12, color: '#1565C0', fontWeight: '600' },
  clearBtn: { padding: 8, backgroundColor: '#FFEBEE', borderRadius: 8 },
  resultCount: { fontSize: 12, color: '#999', paddingHorizontal: 16, paddingVertical: 4 },
  pickerBtns: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 8 },
  pickerCancel: { paddingHorizontal: 20, paddingVertical: 8, backgroundColor: '#F5F5F5', borderRadius: 8 },
  pickerCancelText: { fontSize: 14, fontWeight: '600', color: '#666' },
  pickerDone: { paddingHorizontal: 20, paddingVertical: 8, backgroundColor: '#2E7D32', borderRadius: 8 },
  pickerDoneText: { fontSize: 14, fontWeight: '600', color: '#FFF' },

  // Picker
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 32 },
  pickerCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 8, maxHeight: 400 },
  pickerTitle: { fontSize: 16, fontWeight: '700', color: '#333', padding: 16, paddingBottom: 8 },
  pickerItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 10, marginHorizontal: 8, marginBottom: 2 },
  pickerItemOn: { backgroundColor: '#E8F5E9' },
  pickerItemText: { fontSize: 15, color: '#333' },
  pickerItemTextOn: { fontWeight: '600', color: '#2E7D32' },

  // Tarih header (ajanda)
  dateHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#F5F5F5', borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  dateHeaderToday: { backgroundColor: '#E8F5E9' },
  dateCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#E0E0E0' },
  dateCircleToday: { backgroundColor: '#2E7D32', borderColor: '#2E7D32' },
  dateDay: { fontSize: 18, fontWeight: '800', color: '#333' },
  dateDayName: { fontSize: 14, fontWeight: '600', color: '#333' },
  dateMonth: { fontSize: 12, color: '#999' },
  todayBadge: { marginLeft: 'auto', backgroundColor: '#2E7D32', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  todayBadgeText: { fontSize: 10, fontWeight: '700', color: '#FFF' },

  // Ajanda item
  agendaItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', marginHorizontal: 16, marginTop: 8, borderRadius: 12, padding: 14, gap: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  agendaLine: { width: 4, height: '100%', borderRadius: 2, position: 'absolute', left: 0, top: 8, bottom: 8 },
  agendaIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  agendaBranch: { fontSize: 15, fontWeight: '600', color: '#212121' },
  agendaTemplate: { fontSize: 12, color: '#757575', marginTop: 1 },
  agendaInspector: { fontSize: 11, color: '#999', marginTop: 1 },

  // Empty
  emptyBox: { alignItems: 'center', justifyContent: 'center', flex: 1, marginTop: 80 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#BDBDBD', marginTop: 12 },
  emptyHint: { fontSize: 13, color: '#BDBDBD', marginTop: 6, textAlign: 'center', paddingHorizontal: 40 },
});
