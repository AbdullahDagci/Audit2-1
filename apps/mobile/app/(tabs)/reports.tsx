import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BarChart, LineChart } from 'react-native-chart-kit';
import { api } from '@/lib/api';
import { formatScore } from '@/lib/scoring';

const screenWidth = Dimensions.get('window').width - 64;

const TURKISH_MONTHS = ['Oca', 'Sub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Agu', 'Eyl', 'Eki', 'Kas', 'Ara'];

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

export default function ReportsScreen() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [inspections, setInspections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [dash, inspResult] = await Promise.all([
        api.getDashboard(),
        api.getInspections({ limit: '500' }),
      ]);
      setDashboard(dash);
      setInspections(inspResult.data || []);
    } catch {
      setDashboard(null);
      setInspections([]);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  const stats = dashboard?.stats || { totalInspections: 0, avgScore: 0, criticalCount: 0 };
  const branches: any[] = dashboard?.branches || [];

  // --- Branch Comparison: sort by avgScore descending ---
  const sortedBranches = [...branches].sort((a, b) => (b.avgScore || 0) - (a.avgScore || 0));

  const branchChartData = sortedBranches.length > 0
    ? {
        labels: sortedBranches.slice(0, 8).map((b) =>
          b.name.length > 8 ? b.name.slice(0, 7) + '.' : b.name
        ),
        datasets: [
          {
            data: sortedBranches.slice(0, 8).map((b) => Math.ceil(b.avgScore || 0)),
          },
        ],
      }
    : null;

  // --- Trend Analysis: group completed inspections by month ---
  const completedInsp = inspections.filter((i: any) => i.status === 'completed' || i.status === 'reviewed');
  const monthMap: Record<string, { total: number; count: number }> = {};
  for (const insp of completedInsp) {
    const date = new Date(insp.completedAt || insp.createdAt);
    const key = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`;
    if (!monthMap[key]) monthMap[key] = { total: 0, count: 0 };
    monthMap[key].total += Number(insp.scorePercentage || 0);
    monthMap[key].count += 1;
  }

  const sortedMonths = Object.keys(monthMap).sort();
  const recentMonths = sortedMonths.slice(-6);

  const trendData = recentMonths.length >= 2
    ? {
        labels: recentMonths.map((key) => {
          const monthIdx = parseInt(key.split('-')[1], 10);
          return TURKISH_MONTHS[monthIdx];
        }),
        datasets: [
          {
            data: recentMonths.map((key) => {
              const m = monthMap[key];
              return m.count > 0 ? Math.ceil(m.total / m.count) : 0;
            }),
            strokeWidth: 2,
          },
        ],
      }
    : null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#2E7D32']}
          tintColor="#2E7D32"
        />
      }
    >
      {/* Summary Stats */}
      <View style={styles.statsGrid}>
        <View style={[styles.miniCard, { backgroundColor: '#E8F5E9' }]}>
          <MaterialIcons name="assignment-turned-in" size={22} color="#2E7D32" />
          <Text style={[styles.miniValue, { color: '#2E7D32' }]}>{stats.totalInspections}</Text>
          <Text style={styles.miniLabel}>Toplam Denetim</Text>
        </View>
        <View style={[styles.miniCard, { backgroundColor: '#E3F2FD' }]}>
          <MaterialIcons name="speed" size={22} color="#1565C0" />
          <Text style={[styles.miniValue, { color: '#1565C0' }]}>
            {stats.avgScore ? formatScore(Number(stats.avgScore)) : '-'}
          </Text>
          <Text style={styles.miniLabel}>Ortalama Puan</Text>
        </View>
        <View style={[styles.miniCard, { backgroundColor: '#FFF3E0' }]}>
          <MaterialIcons name="warning" size={22} color="#E65100" />
          <Text style={[styles.miniValue, { color: '#E65100' }]}>{stats.criticalCount}</Text>
          <Text style={styles.miniLabel}>Kritik Bulgu</Text>
        </View>
      </View>

      {/* Branch Comparison Bar Chart */}
      {branchChartData && branchChartData.datasets[0].data.some((d: number) => d > 0) && (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Sube Karsilastirmasi</Text>
          <Text style={styles.chartSubtitle}>Ortalama puanlara gore siralama</Text>
          <BarChart
            data={branchChartData}
            width={screenWidth}
            height={220}
            yAxisLabel=""
            yAxisSuffix=""
            chartConfig={{
              ...chartConfig,
              fillShadowGradient: '#4CAF50',
              fillShadowGradientOpacity: 1,
            }}
            style={styles.chart}
            fromZero
            showValuesOnTopOfBars
          />
        </View>
      )}

      {/* Branch Ranking List */}
      {sortedBranches.length > 0 && (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Sube Siralamasi</Text>
          {sortedBranches.map((b, idx) => {
            const scoreRaw = b.avgScore || 0;
            const score = Number(formatScore(scoreRaw));
            const color = score >= 75 ? '#4CAF50' : score >= 50 ? '#FF9800' : '#F44336';
            const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
            return (
              <View key={b.id || b.name} style={styles.rankRow}>
                <Text style={styles.rankNum}>{medal}</Text>
                <Text style={styles.rankName}>{b.name}</Text>
                <View style={styles.rankBarBg}>
                  <View
                    style={[
                      styles.rankBar,
                      { width: `${Math.ceil(scoreRaw)}%`, backgroundColor: color },
                    ]}
                  />
                </View>
                <Text style={[styles.rankPct, { color }]}>%{score}</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Trend Analysis Line Chart */}
      {trendData && (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Aylik Trend Analizi</Text>
          <Text style={styles.chartSubtitle}>Son aylardaki ortalama denetim puanlari</Text>
          <LineChart
            data={trendData}
            width={screenWidth}
            height={220}
            yAxisLabel=""
            yAxisSuffix=""
            chartConfig={{
              ...chartConfig,
              color: (opacity = 1) => `rgba(21, 101, 192, ${opacity})`,
              fillShadowGradient: '#1565C0',
              fillShadowGradientOpacity: 0.15,
            }}
            bezier
            style={styles.chart}
            fromZero
          />
        </View>
      )}

      {/* Empty State */}
      {sortedBranches.length === 0 && inspections.length === 0 && (
        <View style={styles.emptyBox}>
          <MaterialIcons name="bar-chart" size={48} color="#E0E0E0" />
          <Text style={styles.emptyText}>Henuz rapor verisi yok</Text>
          <Text style={styles.emptyHint}>
            Denetimler tamamlandikca burada raporlar gorunecek
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  statsGrid: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  miniCard: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  miniValue: { fontSize: 26, fontWeight: '800' },
  miniLabel: { fontSize: 11, color: '#666', fontWeight: '600', textAlign: 'center' },
  chartCard: {
    marginBottom: 16,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  chartTitle: { fontSize: 16, fontWeight: '700', color: '#212121', marginBottom: 2 },
  chartSubtitle: { fontSize: 12, color: '#999', marginBottom: 12 },
  chart: { borderRadius: 8, marginLeft: -16 },
  rankRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  rankNum: { width: 24, fontSize: 14, textAlign: 'center' },
  rankName: { width: 70, fontSize: 13, color: '#333', fontWeight: '600' },
  rankBarBg: {
    flex: 1,
    height: 10,
    backgroundColor: '#F0F0F0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  rankBar: { height: '100%', borderRadius: 5 },
  rankPct: { width: 40, fontSize: 13, fontWeight: '700', textAlign: 'right' },
  emptyBox: { alignItems: 'center', marginTop: 40 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#BDBDBD', marginTop: 12 },
  emptyHint: { fontSize: 13, color: '#BDBDBD', marginTop: 6, textAlign: 'center' },
});
