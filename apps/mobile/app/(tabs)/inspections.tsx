import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, Alert, Platform, Modal as RNModal, TextInput, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors } from '@/constants/colors';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ScoreIndicator } from '@/components/inspection/ScoreIndicator';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';

const STATUS_OPTIONS = [
  { key: 'all', label: 'Tümü', icon: 'list' as const },
  { key: 'scheduled', label: 'Planlanmış', icon: 'schedule' as const },
  { key: 'draft', label: 'Taslak', icon: 'edit-note' as const },
  { key: 'in_progress', label: 'Devam Ediyor', icon: 'pending' as const },
  { key: 'completed', label: 'Gönderildi', icon: 'check-circle' as const },
  { key: 'pending_action', label: 'İşlem Bekliyor', icon: 'warning' as const },
  { key: 'reviewed', label: 'Onaylandı', icon: 'verified' as const },
];

const SORT_OPTIONS = [
  { key: 'date_desc', label: 'En Yeni', sort: 'date', order: 'desc' },
  { key: 'date_asc', label: 'En Eski', sort: 'date', order: 'asc' },
  { key: 'score_desc', label: 'Puan (Yüksek)', sort: 'score', order: 'desc' },
  { key: 'score_asc', label: 'Puan (Düşük)', sort: 'score', order: 'asc' },
  { key: 'branch_asc', label: 'Şube (A-Z)', sort: 'branch', order: 'asc' },
];

function statusBadge(status: string) {
  switch (status) {
    case 'scheduled': return { text: 'Planlanmış', variant: 'info' as const };
    case 'completed': return { text: 'Onay Bekliyor', variant: 'warning' as const };
    case 'reviewed': return { text: 'Onaylandı', variant: 'success' as const };
    case 'in_progress': return { text: 'Devam Ediyor', variant: 'info' as const };
    case 'draft': return { text: 'Taslak', variant: 'neutral' as const };
    case 'pending_action': return { text: 'İşlem Bekliyor', variant: 'warning' as const };
    default: return { text: status, variant: 'neutral' as const };
  }
}

export default function InspectionsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isManagerOrAdmin = user?.role === 'admin' || user?.role === 'manager';

  const [inspections, setInspections] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [facilityTypes, setFacilityTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filtreler
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showSortPicker, setShowSortPicker] = useState(false);
  const [selectedSort, setSelectedSort] = useState('date_desc');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());

  // Tarih düzenleme
  const [editingDateId, setEditingDateId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState(new Date());
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);

  const searchTimer = useRef<NodeJS.Timeout | null>(null);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearchQuery(value);
    }, 400);
  };

  const fetchInspections = useCallback(async () => {
    try {
      // Tesis tiplerini çek
      try {
        const types = await api.getFacilityTypes();
        setFacilityTypes(types.filter((t: any) => t.is_active));
      } catch {}

      const sortOption = SORT_OPTIONS.find(s => s.key === selectedSort) || SORT_OPTIONS[0];
      const params: Record<string, string> = {
        sort: sortOption.sort,
        order: sortOption.order,
        limit: '100',
      };
      if (selectedType !== 'all') params.facilityType = selectedType;
      if (selectedStatus !== 'all') params.status = selectedStatus;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const result = await api.getInspections(params);
      let data = result.data || [];

      // Client-side tarih filtresi
      if (startDate) {
        const startMs = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime();
        data = data.filter((i: any) => {
          const raw = i.completedAt || i.scheduledDate || i.createdAt;
          if (!raw) return false;
          const d = new Date(raw);
          return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() >= startMs;
        });
      }
      if (endDate) {
        const endMs = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()).getTime();
        data = data.filter((i: any) => {
          const raw = i.completedAt || i.scheduledDate || i.createdAt;
          if (!raw) return false;
          const d = new Date(raw);
          return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() <= endMs;
        });
      }

      setInspections(data);
      setTotal(result.total || data.length);
    } catch (err: any) {
      setInspections([]);
      setTotal(0);
    }
    setLoading(false);
    setRefreshing(false);
  }, [selectedType, selectedStatus, searchQuery, selectedSort, startDate, endDate]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchInspections();
    }, [fetchInspections])
  );

  const onRefresh = () => { setRefreshing(true); fetchInspections(); };

  const selectedTypeLabel = selectedType === 'all' ? 'Tüm Tipler' : facilityTypes.find((t: any) => t.key === selectedType)?.label || selectedType;
  const selectedSortLabel = SORT_OPTIONS.find(s => s.key === selectedSort)?.label || 'En Yeni';
  const hasDateFilter = startDate || endDate;
  const hasAnyFilter = selectedType !== 'all' || selectedStatus !== 'all' || hasDateFilter || searchQuery.trim();

  const clearFilters = () => {
    setSearchQuery('');
    setSearchInput('');
    setSelectedType('all');
    setSelectedStatus('all');
    setSelectedSort('date_desc');
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

  return (
    <View style={S.container}>
      {/* Arama */}
      <View style={S.searchBar}>
        <MaterialIcons name="search" size={20} color="#999" style={S.searchIcon} />
        <TextInput
          style={S.searchInput}
          placeholder="Şube, denetçi veya şablon ara..."
          placeholderTextColor="#999"
          value={searchInput}
          onChangeText={handleSearchChange}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {searchInput.length > 0 && (
          <TouchableOpacity onPress={() => { setSearchInput(''); setSearchQuery(''); }} style={S.searchClear}>
            <MaterialIcons name="close" size={18} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Durum filtreleri */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={S.statusBar} contentContainerStyle={S.statusBarContent}>
        {STATUS_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            style={[S.statusChip, selectedStatus === opt.key && S.statusChipActive]}
            onPress={() => setSelectedStatus(opt.key)}
          >
            <MaterialIcons name={opt.icon} size={14} color={selectedStatus === opt.key ? '#FFF' : '#666'} />
            <Text style={[S.statusChipText, selectedStatus === opt.key && S.statusChipTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Filtre satiri: tesis tipi, siralama, tarih */}
      <View style={S.filterBar}>
        {/* Tesis tipi */}
        <TouchableOpacity style={S.filterBtn} onPress={() => setShowTypePicker(true)}>
          <MaterialIcons name="category" size={16} color="#2E7D32" />
          <Text style={S.filterBtnText} numberOfLines={1}>{selectedTypeLabel}</Text>
          <MaterialIcons name="keyboard-arrow-down" size={18} color="#999" />
        </TouchableOpacity>

        {/* Siralama */}
        <TouchableOpacity style={S.filterBtn} onPress={() => setShowSortPicker(true)}>
          <MaterialIcons name="sort" size={16} color="#1565C0" />
          <Text style={S.filterBtnText} numberOfLines={1}>{selectedSortLabel}</Text>
          <MaterialIcons name="keyboard-arrow-down" size={18} color="#999" />
        </TouchableOpacity>

        {/* Tarih filtresi */}
        <TouchableOpacity
          style={[S.iconBtn, hasDateFilter && S.iconBtnActive]}
          onPress={() => { setTempDate(startDate || new Date()); setShowStartPicker(true); }}
        >
          <MaterialIcons name="date-range" size={18} color={hasDateFilter ? '#FFF' : '#1565C0'} />
        </TouchableOpacity>

        {/* Temizle */}
        {hasAnyFilter && (
          <TouchableOpacity style={S.clearBtn} onPress={clearFilters}>
            <MaterialIcons name="filter-list-off" size={18} color="#F44336" />
          </TouchableOpacity>
        )}
      </View>

      {/* Tarih gostergesi */}
      {hasDateFilter && (
        <View style={S.dateIndicator}>
          {startDate && (
            <TouchableOpacity style={S.dateTag} onPress={() => { setTempDate(startDate); setShowStartPicker(true); }}>
              <Text style={S.dateTagText}>{formatDate(startDate)}</Text>
              <TouchableOpacity onPress={() => setStartDate(null)}>
                <MaterialIcons name="close" size={14} color="#1565C0" />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
          {startDate && endDate && <Text style={S.dateTagSep}>—</Text>}
          {endDate && (
            <TouchableOpacity style={S.dateTag} onPress={() => { setTempDate(endDate); setShowEndPicker(true); }}>
              <Text style={S.dateTagText}>{formatDate(endDate)}</Text>
              <TouchableOpacity onPress={() => setEndDate(null)}>
                <MaterialIcons name="close" size={14} color="#1565C0" />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
          {startDate && !endDate && (
            <TouchableOpacity style={[S.dateTag, { borderStyle: 'dashed' }]} onPress={() => { setTempDate(new Date()); setShowEndPicker(true); }}>
              <Text style={[S.dateTagText, { color: '#999' }]}>Bitiş ekle</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Sonuc sayisi */}
      <View style={S.resultBar}>
        <Text style={S.resultText}>{inspections.length} denetim</Text>
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

      {/* Tesis tipi picker */}
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

      {/* Siralama picker */}
      <RNModal visible={showSortPicker} transparent animationType="fade" onRequestClose={() => setShowSortPicker(false)}>
        <TouchableOpacity style={S.modalOverlay} activeOpacity={1} onPress={() => setShowSortPicker(false)}>
          <View style={S.modalCard}>
            <Text style={S.modalTitle}>Sıralama</Text>
            {SORT_OPTIONS.map((opt) => (
              <TouchableOpacity key={opt.key} style={[S.modalItem, selectedSort === opt.key && S.modalItemOn]} onPress={() => { setSelectedSort(opt.key); setShowSortPicker(false); }}>
                <Text style={[S.modalItemText, selectedSort === opt.key && S.modalItemTextOn]}>{opt.label}</Text>
                {selectedSort === opt.key && <MaterialIcons name="check" size={20} color="#2E7D32" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </RNModal>

      {/* Liste */}
      {loading ? (
        <View style={S.loadingCenter}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : (
        <FlatList
          data={inspections}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2E7D32']} tintColor="#2E7D32" />}
          renderItem={({ item, index }) => {
            const score = Number(item.scorePercentage || 0);
            const status = statusBadge(item.status);
            return (
              <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
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
                      {item.template?.name && (
                        <Text style={S.templateName}>{item.template.name}</Text>
                      )}
                      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
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
              </Animated.View>
            );
          }}
          contentContainerStyle={S.list}
          ListEmptyComponent={
            <View style={S.emptyBox}>
              <MaterialIcons name="assignment" size={48} color="#E0E0E0" />
              <Text style={S.emptyText}>
                {searchQuery ? `"${searchQuery}" için sonuç bulunamadı` : 'Denetim bulunamadı'}
              </Text>
              {hasAnyFilter && (
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

  // Arama
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12, marginHorizontal: 16, marginTop: 12, paddingHorizontal: 12, minHeight: 48 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#333', paddingVertical: 12 },
  searchClear: { padding: 4 },

  // Durum chip'leri
  statusBar: { marginTop: 10, maxHeight: 44 },
  statusBarContent: { paddingHorizontal: 16, gap: 6 },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0' },
  statusChipActive: { backgroundColor: '#2E7D32', borderColor: '#2E7D32' },
  statusChipText: { fontSize: 12, fontWeight: '600', color: '#666' },
  statusChipTextActive: { color: '#FFF' },

  // Filtre satiri
  filterBar: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  filterBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10 },
  filterBtnText: { flex: 1, fontSize: 12, fontWeight: '600', color: '#333' },
  iconBtn: { padding: 10, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  iconBtnActive: { backgroundColor: '#1565C0', borderColor: '#1565C0' },
  clearBtn: { padding: 10, backgroundColor: '#FFEBEE', borderRadius: 10, minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },

  // Tarih indicator
  dateIndicator: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 6, gap: 6 },
  dateTag: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#E3F2FD', borderWidth: 1, borderColor: '#BBDEFB', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  dateTagText: { fontSize: 12, fontWeight: '600', color: '#1565C0' },
  dateTagSep: { fontSize: 12, color: '#999' },

  // Sonuc
  resultBar: { paddingHorizontal: 16, paddingVertical: 4 },
  resultText: { fontSize: 12, color: '#999' },

  // Picker butonlari
  pickerBtns: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 8 },
  pickerCancel: { paddingHorizontal: 20, paddingVertical: 8, backgroundColor: '#F5F5F5', borderRadius: 8 },
  pickerCancelText: { fontSize: 14, fontWeight: '600', color: '#666' },
  pickerDone: { paddingHorizontal: 20, paddingVertical: 8, backgroundColor: '#2E7D32', borderRadius: 8 },
  pickerDoneText: { fontSize: 14, fontWeight: '600', color: '#FFF' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 32 },
  modalCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 8, maxHeight: 400 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#333', padding: 16, paddingBottom: 8 },
  modalItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 10, marginHorizontal: 8, marginBottom: 2 },
  modalItemOn: { backgroundColor: '#E8F5E9' },
  modalItemText: { fontSize: 15, color: '#333' },
  modalItemTextOn: { fontWeight: '600', color: '#2E7D32' },

  // Liste
  loadingCenter: { flex: 1, padding: 16 },
  list: { padding: 16, paddingTop: 4 },
  card: { marginBottom: 10 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  info: { flex: 1, gap: 4 },
  branch: { fontSize: 16, fontWeight: '600', color: '#212121' },
  meta: { fontSize: 13, color: '#757575' },
  templateName: { fontSize: 12, color: '#999', fontStyle: 'italic' },
  emptyBox: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#BDBDBD', marginTop: 12, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#E3F2FD' },
  actionBtnDanger: { backgroundColor: '#FFEBEE' },
  actionBtnText: { fontSize: 12, fontWeight: '600', color: '#1565C0' },
  dateEditOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  dateEditCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, width: '85%' },
});
