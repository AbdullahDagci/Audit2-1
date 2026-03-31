import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, Modal, TextInput, Platform } from 'react-native';
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

  // Şifre değiştirme state
  const [passwordModal, setPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

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

  const handleSignOut = async () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Çıkış yapmak istediğinize emin misiniz?')) {
        await signOut();
        router.replace('/(auth)/login');
      }
    } else {
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
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Hata', 'Tüm alanları doldurun');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Hata', 'Yeni şifre en az 6 karakter olmalıdır');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Hata', 'Yeni şifreler eşleşmedi');
      return;
    }
    if (!user?.id) {
      Alert.alert('Hata', 'Kullanıcı bilgisi bulunamadı');
      return;
    }

    setChangingPassword(true);
    try {
      await api.changePassword(user.id, { currentPassword, newPassword });
      Alert.alert('Başarılı', 'Şifreniz başarıyla değiştirildi');
      setPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      Alert.alert('Hata', e.message || 'Şifre değiştirilemedi');
    }
    setChangingPassword(false);
  };

  const openPasswordModal = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordModal(true);
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

        <TouchableOpacity style={styles.row} onPress={openPasswordModal}>
          <MaterialIcons name="lock" size={22} color={TEXT2} />
          <Text style={styles.rowText}>Şifre Değiştir</Text>
          <MaterialIcons name="chevron-right" size={22} color={BORDER} />
        </TouchableOpacity>

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

      {/* Şifre Değiştirme Modal */}
      <Modal visible={passwordModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Şifre Değiştir</Text>
              <TouchableOpacity onPress={() => setPasswordModal(false)}>
                <MaterialIcons name="close" size={24} color={TEXT2} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Mevcut Şifre</Text>
            <TextInput
              style={styles.input}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              placeholder="Mevcut şifrenizi girin"
              placeholderTextColor="#999"
            />

            <Text style={styles.inputLabel}>Yeni Şifre</Text>
            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              placeholder="Yeni şifrenizi girin"
              placeholderTextColor="#999"
            />

            <Text style={styles.inputLabel}>Yeni Şifre (Tekrar)</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholder="Yeni şifrenizi tekrar girin"
              placeholderTextColor="#999"
            />

            <TouchableOpacity
              style={[styles.saveBtn, changingPassword && { opacity: 0.6 }]}
              onPress={handleChangePassword}
              disabled={changingPassword}
            >
              {changingPassword ? (
                <ActivityIndicator size="small" color={WHITE} />
              ) : (
                <Text style={styles.saveBtnText}>Kaydet</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  // Modal styles
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20,
  },
  modalContent: {
    backgroundColor: WHITE, borderRadius: 16, padding: 20,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: TEXT },
  inputLabel: { fontSize: 13, fontWeight: '600', color: TEXT2, marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1, borderColor: BORDER, borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: 12, fontSize: 15, color: TEXT, backgroundColor: BG,
  },
  saveBtn: {
    backgroundColor: GREEN, borderRadius: 10, paddingVertical: 14,
    alignItems: 'center', marginTop: 24,
  },
  saveBtnText: { fontSize: 16, fontWeight: '600', color: WHITE },
});
