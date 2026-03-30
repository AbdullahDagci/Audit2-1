import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, Alert, Platform, Modal as RNModal, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '@/constants/colors';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ScoreIndicator } from '@/components/inspection/ScoreIndicator';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';

function statusBadge(status: string) {
  switch (status) {
    case 'scheduled': return { text: 'Planlanmış', variant: 'info' as const };
    case 'completed': return { text: 'Onay Bekliyor', variant: 'warning' as const };
    case 'reviewed': return { text: 'Onaylandı', variant: 'success' as const };
    case 'in_progress': return { text: 'Devam Ediyor', variant: 'info' as const };
    case 'draft': return { text: 'Taslak', variant: 'neutral' as const };
    default: return { text: status, variant: 'neutral' as const };
  }
}

export default function InspectionsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isManagerOrAdmin = user?.role === 'admin' || user?.role === 'manager';

  const [inspections, setInspections] = useState<any[]>([]);
  const [facilityTypes, setFacilityTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filtreler
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());

  // Tarih düzenleme
  const [editingDateId, setEditingDateId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState(new Date());
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);

  const fetchInspections = useCallback(async () => {
    try {
      // Tesis tiplerini çek
      try {
        const types = await api.getFacilityTypes();
        setFacilityTypes(types.filter((t: any) => t.is_active));
      } catch {}

      const params: Record<string, string> = {};
      if (selectedType !== 'all') params.facilityType = selectedType;
      const result = await api.getInspections(params);
      let data = result.data || [];

      // Client-side tarih filtresi
      if (startDate) {
        const startMs = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime();
        data = data.filter((i: any) => {
          const raw = i.completedAt || i.scheduledDate || i.createdAt;
          if (!raw) return false;
          const d = new Date(raw);
          const dMs = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
          return dMs >= startMs;
        });
      }
      if (endDate) {
        const endMs = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()).getTime();
        data = data.filter((i: any) => {
          const raw = i.completedAt || i.scheduledDate || i.createdAt;
          if (!raw) return false;
          const d = new Date(raw);
          const dMs = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
          return dMs <= endMs;
        });
      }

      setInspections(data);
    } catch (err: any) {
      setInspections([]);
    }
    setLoading(false);
    setRefreshing(false);
  }, [selectedType, startDate, endDate]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchInspections();
    }, [fetchInspections])
  );

  const onRefresh = () => { setRefreshing(true); fetchInspections(); };

  const selectedTypeLabel = selectedType === 'all' ? 'Tüm Tipler' : facilityTypes.find((t: any) => t.key === selectedType)?.label || selectedType;
  const hasDateFilter = startDate || endDate;

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedType('all');
    setStartDate(null);
    setEndDate(null);
  };

  const formatDate = (d: Date) => d.toLocaleDateString('tr-TR');

  const canEditInspection = (item: any) =>
    (item.status === 'scheduled' || item.status === 'draft') && item.inspectorId === user?.id;

  const handleEditDate = (item: any) => {
    setEditingDateId(item.id);
    setEditDate(item.scheduledDate ? new Date(item.scheduledDate) : new Date());
    setShowEditDatePicker(true);
  };

  const onEditDateChange = (_e: any, selected?: Date) => {
    if (Platform.OS === 'android') setShowEditDatePicker(false);
    if (selected) setEditDate(selected);
    if (Platform.OS === 'android' && selected && editingDateId) {
      saveEditDate(editingDateId, selected);
    }
  };

  const saveEditDate = async (inspId: string, date: Date) => {
    try {
      await api.updateInspection(inspId, { scheduledDate: date.toISOString().split('T')[0] });
      setInspections(prev => prev.map(i => i.id === inspId ? { ...i, scheduledDate: date.toISOString() } : i));
    } catch (err: any) {
      Alert.alert('Hata', err.message || 'Tarih güncellenemedi.');
    }
    setEditingDateId(null);
    setShowEditDatePicker(false);
  };

  const handleDelete = (item: any) => {
    Alert.alert('Denetimi Sil', `${item.branch?.name || 'Şube'} denetimini silmek istediğinize emin misiniz?`, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil', style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteInspection(item.id);
            setInspections(prev => prev.filter(i => i.id !== item.id));
          } catch (err: any) {
            Alert.alert('Hata', err.message || 'Denetim silinemedi.');
          }
        },
      },
    ]);
  };

  const filteredInspections = searchQuery.trim()
    ? inspections.filter((i: any) => {
        const branchName = (i.branch?.name || '').toLowerCase();
        return branchName.includes(searchQuery.trim().toLowerCase());
      })
    : inspections;

  return (
    <View style={S.container}>
      {/* Arama alanı */}
      <View style={S.searchBar}>
        <MaterialIcons name="search" size={20} color="#999" style={S.searchIcon} />
        <TextInput
          style={S.searchInput}
          placeholder="Şube ara..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={S.searchClear}>
            <MaterialIcons name="close" size={18} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filtre alanı */}
      <View style={S.filterBar}>
        {/* Tesis tipi select */}
        <TouchableOpacity style={S.selectBox} onPress={() => setShowTypePicker(true)}>
          <MaterialIcons name="category" size={18} color="#2E7D32" />
          <Text style={S.selectText} numberOfLines={1}>{selectedTypeLabel}</Text>
          <MaterialIcons name="keyboard-arrow-down" size={20} color="#999" />
        </TouchableOpacity>

        {/* Başlangıç tarihi */}
        <TouchableOpacity style={[S.dateBox, startDate && S.dateBoxActive]} onPress={() => { setTempDate(startDate || new Date()); setShowStartPicker(true); }}>
          <MaterialIcons name="event" size={16} color={startDate ? '#FFF' : '#1565C0'} />
          <Text style={[S.dateText, startDate && S.dateTextActive]} numberOfLines={1}>{startDate ? formatDate(startDate) : 'Başlangıç'}</Text>
        </TouchableOpacity>

        {/* Bitiş tarihi */}
        <TouchableOpacity style={[S.dateBox, endDate && S.dateBoxActive]} onPress={() => { setTempDate(endDate || new Date()); setShowEndPicker(true); }}>
          <MaterialIcons name="event" size={16} color={endDate ? '#FFF' : '#1565C0'} />
          <Text style={[S.dateText, endDate && S.dateTextActive]} numberOfLines={1}>{endDate ? formatDate(endDate) : 'Bitiş'}</Text>
        </TouchableOpacity>

        {/* Temizle */}
        {(selectedType !== 'all' || hasDateFilter || searchQuery.trim()) && (
          <TouchableOpacity style={S.clearBtn} onPress={clearFilters}>
            <MaterialIcons name="close" size={18} color="#F44336" />
          </TouchableOpacity>
        )}
      </View>

      {/* Sonuç sayısı */}
      <View style={S.resultBar}>
        <Text style={S.resultText}>{filteredInspections.length} denetim</Text>
      </View>

      {/* Start date picker */}
      {showStartPicker && (
        <>
          <DateTimePicker
            value={tempDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_e, d) => {
              if (Platform.OS === 'android') {
                setShowStartPicker(false);
                if (d) setStartDate(d);
              } else {
                if (d) setTempDate(d);
              }
            }}
            locale="tr-TR"
          />
          {Platform.OS === 'ios' && (
            <View style={S.pickerBtns}>
              <TouchableOpacity onPress={() => setShowStartPicker(false)} style={S.pickerCancel}><Text style={S.pickerCancelText}>İptal</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => { setStartDate(tempDate); setShowStartPicker(false); }} style={S.pickerDone}><Text style={S.pickerDoneText}>Uygula</Text></TouchableOpacity>
            </View>
          )}
        </>
      )}

      {/* End date picker */}
      {showEndPicker && (
        <>
          <DateTimePicker
            value={tempDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_e, d) => {
              if (Platform.OS === 'android') {
                setShowEndPicker(false);
                if (d) setEndDate(d);
              } else {
                if (d) setTempDate(d);
              }
            }}
            locale="tr-TR"
          />
          {Platform.OS === 'ios' && (
            <View style={S.pickerBtns}>
              <TouchableOpacity onPress={() => setShowEndPicker(false)} style={S.pickerCancel}><Text style={S.pickerCancelText}>İptal</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => { setEndDate(tempDate); setShowEndPicker(false); }} style={S.pickerDone}><Text style={S.pickerDoneText}>Uygula</Text></TouchableOpacity>
            </View>
          )}
        </>
      )}

      {/* Tesis tipi picker modal */}
      <RNModal visible={showTypePicker} transparent animationType="fade" onRequestClose={() => setShowTypePicker(false)}>
        <TouchableOpacity style={S.modalOverlay} activeOpacity={1} onPress={() => setShowTypePicker(false)}>
          <View style={S.modalCard}>
            <Text style={S.modalTitle}>Tesis Tipi Seçin</Text>
            <TouchableOpacity style={[S.modalItem, selectedType === 'all' && S.modalItemOn]} onPress={() => { setSelectedType('all'); setShowTypePicker(false); }}>
              <Text style={[S.modalItemText, selectedType === 'all' && S.modalItemTextOn]}>Tüm Tipler</Text>
              {selectedType === 'all' && <MaterialIcons name="check" size={20} color="#2E7D32" />}
            </TouchableOpacity>
            {facilityTypes.map((t: any) => (
              <TouchableOpacity key={t.key} style={[S.modalItem, selectedType === t.key && S.modalItemOn]} onPress={() => { setSelectedType(t.key); setShowTypePicker(false); }}>
                <Text style={[S.modalItemText, selectedType === t.key && S.modalItemTextOn]}>{t.label}</Text>
                {selectedType === t.key && <MaterialIcons name="check" size={20} color="#2E7D32" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </RNModal>

      {/* Liste */}
      {loading ? (
        <View style={S.loadingCenter}><ActivityIndicator size="large" color="#2E7D32" /></View>
      ) : (
        <FlatList
          data={filteredInspections}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2E7D32']} tintColor="#2E7D32" />}
          renderItem={({ item }) => {
            const score = Number(item.scorePercentage || 0);
            const status = statusBadge(item.status);
            return (
              <Card style={S.card} onPress={() => {
                if (item.status === 'in_progress') {
                  router.push(`/inspection/${item.id}`);
                } else {
                  router.push(`/inspection/review?id=${item.id}`);
                }
              }}>
                <View style={S.cardRow}>
                  <View style={S.info}>
                    <Text style={S.branch}>{item.branch?.name || 'Şube'}</Text>
                    <Text style={S.meta}>
                      {item.scheduledDate
                        ? `Planlanan: ${new Date(item.scheduledDate).toLocaleDateString('tr-TR')}`
                        : new Date(item.completedAt || item.createdAt).toLocaleDateString('tr-TR')}
                      {isManagerOrAdmin && item.inspector?.fullName ? ` — ${item.inspector.fullName}` : ''}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                      <Badge text={facilityTypes.find(f => f.key === item.branch?.facilityType)?.label || item.branch?.facilityType || ''} variant="info" />
                      <Badge text={status.text} variant={status.variant} />
                    </View>
                  </View>
                  {score > 0 && <ScoreIndicator percentage={score} size="sm" showLabel={false} />}
                </View>
                {canEditInspection(item) && (
                  <View style={S.actions}>
                    <TouchableOpacity style={S.actionBtn} onPress={(e) => { e.stopPropagation?.(); handleEditDate(item); }}>
                      <MaterialIcons name="edit-calendar" size={16} color="#1565C0" />
                      <Text style={S.actionBtnText}>Tarih Değiştir</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[S.actionBtn, S.actionBtnDanger]} onPress={(e) => { e.stopPropagation?.(); handleDelete(item); }}>
                      <MaterialIcons name="delete-outline" size={16} color="#C62828" />
                      <Text style={[S.actionBtnText, { color: '#C62828' }]}>Sil</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </Card>
            );
          }}
          contentContainerStyle={S.list}
          ListEmptyComponent={
            <View style={S.emptyBox}>
              <MaterialIcons name="assignment" size={48} color="#E0E0E0" />
              <Text style={S.emptyText}>Denetim bulunamadı</Text>
              {(selectedType !== 'all' || hasDateFilter || searchQuery.trim()) && (
                <TouchableOpacity onPress={clearFilters} style={{ marginTop: 12 }}>
                  <Text style={{ color: '#2E7D32', fontWeight: '600', fontSize: 14 }}>Filtreleri Temizle</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* Tarih düzenleme picker */}
      {showEditDatePicker && (
        <View style={S.dateEditOverlay}>
          <View style={S.dateEditCard}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 8 }}>Yeni tarih seçin</Text>
            <DateTimePicker
              value={editDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={new Date(Date.now() + 86400000)}
              onChange={onEditDateChange}
              locale="tr-TR"
            />
            {Platform.OS === 'ios' && (
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <TouchableOpacity onPress={() => { setShowEditDatePicker(false); setEditingDateId(null); }} style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#F5F5F5', borderRadius: 8 }}>
                  <Text style={{ color: '#666', fontWeight: '600' }}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => editingDateId && saveEditDate(editingDateId, editDate)} style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#2E7D32', borderRadius: 8 }}>
                  <Text style={{ color: '#FFF', fontWeight: '600' }}>Kaydet</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, marginHorizontal: 16, marginTop: 12, paddingHorizontal: 10, minHeight: 48 },
  searchIcon: { marginRight: 6 },
  searchInput: { flex: 1, fontSize: 14, color: '#333', paddingVertical: 12 },
  searchClear: { padding: 4 },
  filterBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  selectBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10 },
  selectText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#333' },
  dateBox: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, minHeight: 44, minWidth: 44, paddingHorizontal: 14, paddingVertical: 10 },
  dateBoxActive: { backgroundColor: '#1565C0', borderColor: '#1565C0' },
  dateText: { fontSize: 12, color: '#1565C0', fontWeight: '600' },
  dateTextActive: { color: '#FFF' },
  clearBtn: { padding: 8, backgroundColor: '#FFEBEE', borderRadius: 8, minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  resultBar: { paddingHorizontal: 16, paddingVertical: 6 },
  resultText: { fontSize: 12, color: '#999' },
  pickerBtns: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 8 },
  pickerCancel: { paddingHorizontal: 20, paddingVertical: 8, backgroundColor: '#F5F5F5', borderRadius: 8 },
  pickerCancelText: { fontSize: 14, fontWeight: '600', color: '#666' },
  pickerDone: { paddingHorizontal: 20, paddingVertical: 8, backgroundColor: '#2E7D32', borderRadius: 8 },
  pickerDoneText: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 32 },
  modalCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 8, maxHeight: 400 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#333', padding: 16, paddingBottom: 8 },
  modalItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 10, marginHorizontal: 8, marginBottom: 2 },
  modalItemOn: { backgroundColor: '#E8F5E9' },
  modalItemText: { fontSize: 15, color: '#333' },
  modalItemTextOn: { fontWeight: '600', color: '#2E7D32' },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingTop: 4 },
  card: { marginBottom: 10 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  info: { flex: 1, gap: 4 },
  branch: { fontSize: 16, fontWeight: '600', color: '#212121' },
  meta: { fontSize: 13, color: '#757575' },
  emptyBox: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#BDBDBD', marginTop: 12 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#E3F2FD' },
  actionBtnDanger: { backgroundColor: '#FFEBEE' },
  actionBtnText: { fontSize: 12, fontWeight: '600', color: '#1565C0' },
  dateEditOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  dateEditCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, width: '85%' },
});
