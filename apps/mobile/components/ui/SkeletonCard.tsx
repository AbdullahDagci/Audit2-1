import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from './Skeleton';

interface SkeletonCardProps {
  lines?: number;
}

export function SkeletonCard({ lines = 3 }: SkeletonCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.content}>
          <Skeleton width="70%" height={16} borderRadius={4} />
          <Skeleton width="50%" height={12} borderRadius={4} />
          {lines >= 3 && <Skeleton width="35%" height={10} borderRadius={4} />}
        </View>
        <Skeleton width={50} height={50} borderRadius={25} />
      </View>
    </View>
  );
}

export function SkeletonDashboard() {
  return (
    <View style={styles.dashboardContainer}>
      {/* Greeting */}
      <Skeleton width={120} height={14} borderRadius={4} />
      <View style={{ height: 8 }} />
      <Skeleton width={200} height={22} borderRadius={4} />
      <View style={{ height: 20 }} />

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}><Skeleton width="100%" height={80} borderRadius={12} /></View>
        <View style={styles.statBox}><Skeleton width="100%" height={80} borderRadius={12} /></View>
        <View style={styles.statBox}><Skeleton width="100%" height={80} borderRadius={12} /></View>
      </View>
      <View style={{ height: 20 }} />

      {/* Cards */}
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    gap: 8,
    marginRight: 12,
  },
  dashboardContainer: {
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
  },
});
