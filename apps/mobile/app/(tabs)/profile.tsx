import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';
import { formatScore } from '@/lib/scoring';

const GREEN = '#2E7D32';
const LIGHT_GREEN = '#4CAF50';
const BG = '#F5F5F5';
const WHITE = '#FFFFFF';
const TEXT = '#212121';
const TEXT2 = '#757575';
const BORDER = '#E0E0E0';
const RED = '#F44336';

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);

  const [stats, setStats] = useState({ total: 0, avg: 0, thisMonth: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const result = await api.getInspections();
      const inspections = result.data || [];
      const total = inspections.length;

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisMonth = inspections.filter((i: any) => {
        const d = new Date(i.completedAt || i.createdAt);
        return d >= monthStart;
      }).length;

      const completed = inspections.filter((i: any) => i.scorePercentage && Number(i.scorePercentage) > 0);
      const avg = completed.length > 0
        ? Number(formatScore(completed.reduce((s: number, i: any) => s + Number(i.scorePercentage), 0) / completed.length))
        : 0;

      setStats({ total, avg, thisMonth });
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  const onRefresh = () => { setRefreshing(true); fetchStats(); };

  const name = user?.fullName || 'Kullanıcı';
  const initials = name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
  const role = user?.role === 'admin' ? 'Yönetici' : user?.role === 'manager' ? 'Müdür' : 'Denetçi';

  const handleSignOut = () => {
    Alert.alert('Çıkış', 'Çıkış yapmak istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Çıkış Yap',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[GREEN]} tintColor={GREEN} />}
    >
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.role}>{role}</Text>
        <Text style={styles.email}>{user?.email || ''}</Text>
        {user?.phone && <Text style={styles.phone}>{user.phone}</Text>}
      </View>

      {loading ? (
        <ActivityIndicator size="small" color={GREEN} style={{ marginBottom: 20 }} />
      ) : (
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Toplam</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: GREEN }]}>{stats.avg || '-'}</Text>
            <Text style={styles.statLabel}>Ortalama</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.thisMonth}</Text>
            <Text style={styles.statLabel}>Bu Ay</Text>
          </View>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Ayarlar</Text>

        <TouchableOpacity style={styles.row} onPress={() => router.push('/notifications')}>
          <MaterialIcons name="notifications" size={22} color={TEXT2} />
          <Text style={styles.rowText}>Bildirimler</Text>
          <MaterialIcons name="chevron-right" size={22} color={BORDER} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.row} onPress={() => router.push('/settings')}>
          <MaterialIcons name="settings" size={22} color={TEXT2} />
          <Text style={styles.rowText}>Ayarlar</Text>
          <MaterialIcons name="chevron-right" size={22} color={BORDER} />
        </TouchableOpacity>

        <View style={styles.row}>
          <MaterialIcons name="info-outline" size={22} color={TEXT2} />
          <Text style={styles.rowText}>Versiyon 1.0.0</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleSignOut}>
        <MaterialIcons name="logout" size={20} color={WHITE} />
        <Text style={styles.logoutText}>Çıkış Yap</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  content: { padding: 16, paddingBottom: 40 },
  avatarSection: { alignItems: 'center', marginBottom: 24, marginTop: 8 },
  avatar: {
    width: 90, height: 90, borderRadius: 45, backgroundColor: GREEN,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarText: { fontSize: 32, fontWeight: '700', color: WHITE },
  name: { fontSize: 22, fontWeight: '700', color: TEXT },
  role: { fontSize: 15, color: LIGHT_GREEN, fontWeight: '600', marginTop: 2 },
  email: { fontSize: 14, color: TEXT2, marginTop: 4 },
  phone: { fontSize: 13, color: TEXT2, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1, alignItems: 'center', paddingVertical: 14, backgroundColor: WHITE,
    borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  statValue: { fontSize: 24, fontWeight: '700', color: TEXT },
  statLabel: { fontSize: 11, color: TEXT2, marginTop: 4 },
  card: {
    backgroundColor: WHITE, borderRadius: 12, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: TEXT, marginBottom: 12 },
  row: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: BORDER, gap: 12,
  },
  rowText: { flex: 1, fontSize: 15, color: TEXT },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: RED, borderRadius: 12, paddingVertical: 14, marginTop: 20,
  },
  logoutText: { fontSize: 16, fontWeight: '600', color: WHITE },
});
