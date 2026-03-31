import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Dimensions, ScrollView, ActivityIndicator, Modal as RNModal } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors } from '@/constants/colors';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ScoreIndicator } from '@/components/inspection/ScoreIndicator';
import { SkeletonDashboard, SkeletonCard } from '@/components/ui/SkeletonCard';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';
import { BarChart, LineChart } from 'react-native-chart-kit';
import { formatScore } from '@/lib/scoring';

const screenWidth = Dimensions.get('window').width - 64;

function statusBadge(status: string) {
  switch (status) {
    case 'scheduled': return { text: 'Planlanmış', variant: 'info' as const };
    case 'completed': return { text: 'Onay Bekliyor', variant: 'warning' as const };
    case 'pending_action': return { text: 'İşlem Bekliyor', variant: 'warning' as const };
    case 'reviewed': return { text: 'Onaylandı', variant: 'success' as const };
    case 'in_progress': return { text: 'Devam Ediyor', variant: 'info' as const };
    case 'draft': return { text: 'Taslak', variant: 'neutral' as const };
    default: return { text: status, variant: 'neutral' as const };
  }
}

const chartConfig = {
  backgroundColor: '#FFFFFF',
  backgroundGradientFrom: '#FFFFFF',
  backgroundGradientTo: '#FFFFFF',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(46, 125, 50, ${opacity})`,
  labelColor: () => '#757575',
  barPercentage: 0.6,
  propsForLabels: { fontSize: 11 },
  propsForBackgroundLines: { stroke: '#F0F0F0' },
};

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  const [inspections, setInspections] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<any>(null);
  const [facilityTypes, setFacilityTypes] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedFacility, setSelectedFacility] = useState('all');
  const [showPicker, setShowPicker] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      // Tesis tiplerini API'den çek
      try {
        const types = await api.getFacilityTypes();
        setFacilityTypes(types.filter((t: any) => t.is_active));
      } catch {}

      const params: Record<string, string> = {};
      if (selectedFacility !== 'all') params.facilityType = selectedFacility;
      const result = await api.getInspections(params);
      setInspections(result.data || []);

      if (isAdmin) {
        try {
          const dash = await api.getDashboard();
          setDashboard(dash);
        } catch {}
      }
    } catch {
      setInspections([]);
    }
    setLoading(false);
    setRefreshing(false);
  }, [isAdmin, selectedFacility]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchData();
    }, [fetchData])
  );

  const selectedLabel = selectedFacility === 'all' ? 'Tüm Tesisler' : facilityTypes.find((t: any) => t.key === selectedFacility)?.label || selectedFacility;
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  if (loading) {
    return <View style={styles.container}><SkeletonDashboard /></View>;
  }

  const completedInspections = inspections.filter(i => i.status === 'completed' || i.status === 'reviewed');
  const completedCount = completedInspections.length;
  const avgScore = completedCount > 0
    ? Math.ceil(completedInspections.reduce((s, i) => s + Number(i.scorePercentage || 0), 0) / completedCount)
    : 0;

  // Admin Dashboard
  if (isAdmin) {
    const allBranches = dashboard?.branches || [];
    const branches = selectedFacility === 'all' ? allBranches : allBranches.filter((b: any) => b.facilityType === selectedFacility);
    const stats = dashboard?.stats || { totalInspections: 0, avgScore: 0, criticalCount: 0, pendingSchedules: 0 };

    // Filtreye göre stat hesapla
    const filteredStats = selectedFacility === 'all' ? stats : {
      totalInspections: inspections.length,
      avgScore: avgScore,
      criticalCount: stats.criticalCount,
      pendingSchedules: stats.pendingSchedules,
    };
    const pendingApprovals = inspections.filter(i => i.status === 'completed').length;

    // Şube performans grafik verisi
    const branchChartData = branches.length > 0 ? {
      labels: branches.slice(0, 6).map((b: any) => b.name.length > 8 ? b.name.slice(0, 7) + '.' : b.name),
      datasets: [{ data: branches.slice(0, 6).map((b: any) => Math.ceil(b.avgScore || 0)) }],
    } : null;

    // Sıralı şubeler
    const sortedBranches = [...branches].sort((a: any, b: any) => (b.avgScore || 0) - (a.avgScore || 0));
    const topBranch = sortedBranches[0];
    const worstBranch = sortedBranches[sortedBranches.length - 1];

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2E7D32']} tintColor="#2E7D32" />}>

        <Text style={styles.greeting}>Hoş geldiniz,</Text>
        <Text style={styles.userName}>{user?.fullName || 'Yönetici'}</Text>
        <View style={styles.roleBadge}>
          <MaterialIcons name="admin-panel-settings" size={14} color="#1565C0" />
          <Text style={styles.roleBadgeText}>{user?.role === 'admin' ? 'Yönetici Paneli' : 'Müdür Paneli'}</Text>
        </View>

        {/* Tesis tipi filtresi - select */}
        <TouchableOpacity style={styles.selectBox} onPress={() => setShowPicker(true)}>
          <MaterialIcons name="filter-list" size={20} color="#2E7D32" />
          <Text style={styles.selectText}>{selectedLabel}</Text>
          <MaterialIcons name="keyboard-arrow-down" size={22} color="#666" />
        </TouchableOpacity>

        {showPicker && (
          <RNModal visible transparent animationType="fade" onRequestClose={() => setShowPicker(false)}>
            <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setShowPicker(false)}>
              <View style={styles.pickerCard}>
                <Text style={styles.pickerTitle}>Tesis Tipi Seçin</Text>
                <TouchableOpacity style={[styles.pickerItem, selectedFacility === 'all' && styles.pickerItemOn]} onPress={() => { setSelectedFacility('all'); setShowPicker(false); }}>
                  <Text style={[styles.pickerItemText, selectedFacility === 'all' && styles.pickerItemTextOn]}>Tüm Tesisler</Text>
                  {selectedFacility === 'all' && <MaterialIcons name="check" size={20} color="#2E7D32" />}
                </TouchableOpacity>
                {facilityTypes.map((t: any) => (
                  <TouchableOpacity key={t.key} style={[styles.pickerItem, selectedFacility === t.key && styles.pickerItemOn]} onPress={() => { setSelectedFacility(t.key); setShowPicker(false); }}>
                    <Text style={[styles.pickerItemText, selectedFacility === t.key && styles.pickerItemTextOn]}>{t.label}</Text>
                    {selectedFacility === t.key && <MaterialIcons name="check" size={20} color="#2E7D32" />}
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </RNModal>
        )}

        {/* Özet Kartları */}
        <View style={styles.statsGrid}>
          <View style={[styles.miniCard, { backgroundColor: '#E8F5E9' }]}>
            <MaterialIcons name="assignment-turned-in" size={22} color="#2E7D32" />
            <Text style={[styles.miniValue, { color: '#2E7D32' }]}>{filteredStats.totalInspections}</Text>
            <Text style={styles.miniLabel}>Toplam Denetim</Text>
          </View>
          <View style={[styles.miniCard, { backgroundColor: '#FFF3E0' }]}>
            <MaterialIcons name="warning" size={22} color="#E65100" />
            <Text style={[styles.miniValue, { color: '#E65100' }]}>{filteredStats.criticalCount}</Text>
            <Text style={styles.miniLabel}>Kritik Bulgu</Text>
          </View>
          <View style={[styles.miniCard, { backgroundColor: '#E3F2FD' }]}>
            <MaterialIcons name="speed" size={22} color="#1565C0" />
            <Text style={[styles.miniValue, { color: '#1565C0' }]}>{filteredStats.avgScore ? Math.ceil(Number(filteredStats.avgScore)) : '-'}</Text>
            <Text style={styles.miniLabel}>Ort. Puan</Text>
          </View>
          <View style={[styles.miniCard, { backgroundColor: '#FCE4EC' }]}>
            <MaterialIcons name="pending-actions" size={22} color="#C62828" />
            <Text style={[styles.miniValue, { color: '#C62828' }]}>{pendingApprovals}</Text>
            <Text style={styles.miniLabel}>Onay Bekleyen</Text>
          </View>
        </View>

        {/* Ayın En Başarılısı / En Düşük */}
        {topBranch && worstBranch && sortedBranches.length > 1 && (
          <View style={styles.topBottomRow}>
            <Card style={[styles.rankCard, { borderLeftColor: '#4CAF50', borderLeftWidth: 4 }] as any}>
              <MaterialIcons name="emoji-events" size={24} color="#FFB300" />
              <Text style={styles.rankTitle}>Ayın En Başarılısı</Text>
              <Text style={styles.rankBranch}>{topBranch.name}</Text>
              <Text style={[styles.rankScore, { color: '#4CAF50' }]}>%{formatScore(topBranch.avgScore)}</Text>
            </Card>
            <Card style={[styles.rankCard, { borderLeftColor: '#F44336', borderLeftWidth: 4 }] as any}>
              <MaterialIcons name="trending-down" size={24} color="#F44336" />
              <Text style={styles.rankTitle}>Gelişme Gereken</Text>
              <Text style={styles.rankBranch}>{worstBranch.name}</Text>
              <Text style={[styles.rankScore, { color: '#F44336' }]}>%{formatScore(worstBranch.avgScore)}</Text>
            </Card>
          </View>
        )}

        {/* Şube Performans Grafiği */}
        {branchChartData && branchChartData.datasets[0].data.some((d: number) => d > 0) && (
          <Card style={styles.chartCard}>
            <Text style={styles.chartTitle}>Şube Performansı</Text>
            <Text style={styles.chartSubtitle}>Ortalama denetim puanları</Text>
            <BarChart
              data={branchChartData}
              width={screenWidth}
              height={200}
              yAxisLabel=""
              yAxisSuffix=""
              chartConfig={{ ...chartConfig, fillShadowGradient: '#4CAF50', fillShadowGradientOpacity: 1 }}
              style={styles.chart}
              fromZero
              showValuesOnTopOfBars
            />
          </Card>
        )}

        {/* Şube Sıralaması */}
        {sortedBranches.length > 0 && (
          <Card style={styles.chartCard}>
            <Text style={styles.chartTitle}>Şube Sıralaması</Text>
            {sortedBranches.map((b: any, idx: number) => {
              const scoreRaw = b.avgScore || 0;
              const score = Number(formatScore(scoreRaw));
              const color = score >= 75 ? '#4CAF50' : score >= 50 ? '#FF9800' : '#F44336';
              const medal = idx === 0 ? '1.' : idx === 1 ? '2.' : idx === 2 ? '3.' : `${idx + 1}.`;
              return (
                <View key={b.id || b.name} style={styles.rankRow}>
                  <Text style={styles.rankNum}>{medal}</Text>
                  <Text style={styles.rankName}>{b.name}</Text>
                  <View style={styles.rankBarBg}>
                    <View style={[styles.rankBar, { width: `${Math.ceil(scoreRaw)}%`, backgroundColor: color }]} />
                  </View>
                  <Text style={[styles.rankPct, { color }]}>%{score}</Text>
                </View>
              );
            })}
          </Card>
        )}

        {/* Denetim yoksa */}
        {inspections.length === 0 && branches.length === 0 && (
          <View style={styles.emptyBox}>
            <MaterialIcons name="bar-chart" size={48} color="#E0E0E0" />
            <Text style={styles.emptyText}>Henüz denetim verisi yok</Text>
            <Text style={styles.emptyHint}>Denetimler tamamlandıkça burada grafikler görünecek</Text>
          </View>
        )}

        {/* Son Denetimler */}
        {inspections.length > 0 && (
          <Card style={styles.chartCard}>
            <Text style={styles.chartTitle}>Son Denetimler</Text>
            {inspections.slice(0, 5).map((item) => {
              const score = Number(item.scorePercentage || 0);
              const status = statusBadge(item.status);
              return (
                <TouchableOpacity key={item.id} style={styles.recentRow} onPress={() => item.status === 'in_progress' ? router.push(`/inspection/${item.id}`) : router.push(`/inspection/review?id=${item.id}`)}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recentBranch}>{item.branch?.name}</Text>
                    <Text style={styles.recentMeta}>
                      {new Date(item.completedAt || item.createdAt).toLocaleDateString('tr-TR')} — {item.inspector?.fullName}
                    </Text>
                  </View>
                  <Badge text={status.text} variant={status.variant} />
                  {score > 0 && <Text style={[styles.recentScore, { color: score >= 75 ? '#4CAF50' : score >= 50 ? '#FF9800' : '#F44336' }]}>%{formatScore(score)}</Text>}
                </TouchableOpacity>
              );
            })}
          </Card>
        )}
      </ScrollView>
    );
  }

  // ========== DENETCİ ANA SAYFASI ==========
  return (
    <View style={styles.container}>
      <FlatList
        data={inspections.slice(0, 10)}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2E7D32']} tintColor="#2E7D32" />}
        ListHeaderComponent={
          <>
            <Text style={styles.greeting}>Hoş geldiniz,</Text>
            <Text style={styles.userName}>{user?.fullName || 'Denetçi'}</Text>

            <View style={styles.statsRow}>
              <Card style={styles.statCard}>
                <Text style={styles.statValue}>{inspections.length}</Text>
                <Text style={styles.statLabel}>Toplam</Text>
              </Card>
              <Card style={styles.statCard}>
                <Text style={styles.statValue}>{completedCount}</Text>
                <Text style={styles.statLabel}>Tamamlanan</Text>
              </Card>
              <Card style={styles.statCard}>
                <Text style={[styles.statValue, { color: Colors.primary }]}>{avgScore || '-'}</Text>
                <Text style={styles.statLabel}>Ort. Puan</Text>
              </Card>
            </View>

            {inspections.length > 0 && <Text style={styles.sectionTitle}>Son Denetimler</Text>}
            {inspections.length === 0 && (
              <View style={styles.emptyBox}>
                <MaterialIcons name="assignment" size={48} color="#E0E0E0" />
                <Text style={styles.emptyText}>Henüz denetim yapılmamış</Text>
                <Text style={styles.emptyHint}>Aşağıdaki butona tıklayarak ilk denetiminizi başlatın</Text>
              </View>
            )}
          </>
        }
        renderItem={({ item, index }) => {
          const score = Number(item.scorePercentage || 0);
          const status = statusBadge(item.status);
          return (
            <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
              <Card style={styles.inspectionCard} onPress={() => item.status === 'in_progress' ? router.push(`/inspection/${item.id}`) : router.push(`/inspection/review?id=${item.id}`)}>
                <View style={styles.cardRow}>
                  <View style={styles.cardInfo}>
                    <Text style={styles.branchName}>{item.branch?.name || 'Sube'}</Text>
                    <Text style={styles.dateText}>{new Date(item.completedAt || item.createdAt).toLocaleDateString('tr-TR')}</Text>
                    <Badge text={status.text} variant={status.variant} />
                  </View>
                  {score > 0 && <ScoreIndicator percentage={score} size="sm" showLabel={false} />}
                </View>
              </Card>
            </Animated.View>
          );
        }}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/inspection/new')} activeOpacity={0.8}>
        <MaterialIcons name="add" size={28} color="#FFF" />
        <Text style={styles.fabText}>Yeni Denetim</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  list: { padding: 16, paddingBottom: 100 },
  greeting: { fontSize: 16, color: '#757575' },
  userName: { fontSize: 24, fontWeight: '700', color: '#212121', marginBottom: 4 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E3F2FD', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start', marginBottom: 12 },
  roleBadgeText: { fontSize: 12, fontWeight: '600', color: '#1565C0' },
  selectBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16 },
  selectText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#333' },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 32 },
  pickerCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 8, maxHeight: 400 },
  pickerTitle: { fontSize: 16, fontWeight: '700', color: '#333', padding: 16, paddingBottom: 8 },
  pickerItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 10, marginHorizontal: 8, marginBottom: 2 },
  pickerItemOn: { backgroundColor: '#E8F5E9' },
  pickerItemText: { fontSize: 15, color: '#333' },
  pickerItemTextOn: { fontWeight: '600', color: '#2E7D32' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  miniCard: { width: '47%', borderRadius: 12, padding: 14, alignItems: 'center', gap: 4 },
  miniValue: { fontSize: 26, fontWeight: '800' },
  miniLabel: { fontSize: 11, color: '#666', fontWeight: '600' },
  topBottomRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  rankCard: { flex: 1, alignItems: 'center', paddingVertical: 14, gap: 4 },
  rankTitle: { fontSize: 11, color: '#999', fontWeight: '600', textTransform: 'uppercase' },
  rankBranch: { fontSize: 15, fontWeight: '700', color: '#212121' },
  rankScore: { fontSize: 22, fontWeight: '800' },
  chartCard: { marginBottom: 16, backgroundColor: '#FFF', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  chartTitle: { fontSize: 16, fontWeight: '700', color: '#212121', marginBottom: 2 },
  chartSubtitle: { fontSize: 12, color: '#999', marginBottom: 12 },
  chart: { borderRadius: 8, marginLeft: -16 },
  rankRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  rankNum: { width: 24, fontSize: 14, textAlign: 'center' },
  rankName: { width: 70, fontSize: 13, color: '#333', fontWeight: '600' },
  rankBarBg: { flex: 1, height: 10, backgroundColor: '#F0F0F0', borderRadius: 5, overflow: 'hidden' },
  rankBar: { height: '100%', borderRadius: 5 },
  rankPct: { width: 40, fontSize: 13, fontWeight: '700', textAlign: 'right' },
  recentRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  recentBranch: { fontSize: 14, fontWeight: '600', color: '#333' },
  recentMeta: { fontSize: 11, color: '#999' },
  recentScore: { fontSize: 14, fontWeight: '700', marginLeft: 8 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24, marginTop: 12 },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statValue: { fontSize: 28, fontWeight: '700', color: '#212121' },
  statLabel: { fontSize: 13, color: '#757575', marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#212121', marginBottom: 12 },
  emptyBox: { alignItems: 'center', marginTop: 40 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#BDBDBD', marginTop: 12 },
  emptyHint: { fontSize: 13, color: '#BDBDBD', marginTop: 6, textAlign: 'center' },
  inspectionCard: { marginBottom: 10 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardInfo: { flex: 1, gap: 4 },
  branchName: { fontSize: 16, fontWeight: '600', color: '#212121' },
  dateText: { fontSize: 13, color: '#757575' },
  fab: {
    position: 'absolute', bottom: 24, right: 20, left: 20,
    backgroundColor: '#2E7D32', borderRadius: 16, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: '#2E7D32', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  fabText: { color: '#FFF', fontSize: 17, fontWeight: '600' },
});
