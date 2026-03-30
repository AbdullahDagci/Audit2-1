import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { api } from '@/lib/api';

const typeIcons: Record<string, { name: keyof typeof MaterialIcons.glyphMap; color: string }> = {
  inspection: { name: 'assignment', color: Colors.primary },
  corrective: { name: 'warning', color: '#E65100' },
  critical: { name: 'warning', color: Colors.danger },
  reminder: { name: 'alarm', color: Colors.secondary },
  info: { name: 'check-circle', color: Colors.success },
  overdue: { name: 'schedule', color: Colors.danger },
  schedule: { name: 'event', color: '#1565C0' },
};

function getRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'Az once';
  if (diffMin < 60) return `${diffMin} dk once`;
  if (diffHour < 24) return `${diffHour} saat once`;
  if (diffDay === 1) return 'Dun';
  if (diffDay < 7) return `${diffDay} gun once`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)} hafta once`;
  return date.toLocaleDateString('tr-TR');
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      setNotifications([]);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [fetchNotifications])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const markAsRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch {
      // Sessizce devam et
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingCenter}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      data={notifications}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[Colors.primary]}
          tintColor={Colors.primary}
        />
      }
      renderItem={({ item }) => {
        const iconType = item.type || 'info';
        const icon = typeIcons[iconType] || typeIcons.info;
        return (
          <TouchableOpacity
            style={[styles.item, !item.read && styles.unread]}
            onPress={() => markAsRead(item.id)}
            activeOpacity={0.7}
          >
            {!item.read && <View style={styles.unreadDot} />}
            <View style={[styles.iconCircle, { backgroundColor: icon.color + '15' }]}>
              <MaterialIcons name={icon.name} size={22} color={icon.color} />
            </View>
            <View style={styles.content}>
              <Text style={[styles.title, !item.read && styles.titleBold]}>{item.title}</Text>
              <Text style={styles.body}>{item.body}</Text>
              <Text style={styles.time}>
                {item.createdAt ? getRelativeTime(item.createdAt) : ''}
              </Text>
            </View>
          </TouchableOpacity>
        );
      }}
      contentContainerStyle={[
        styles.list,
        notifications.length === 0 && { flex: 1 },
      ]}
      ListEmptyComponent={
        <View style={styles.empty}>
          <MaterialIcons name="notifications-none" size={48} color={Colors.textLight} />
          <Text style={styles.emptyText}>Bildirim yok</Text>
          <Text style={styles.emptyHint}>Yeni bildirimleriniz burada gorunecek</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { backgroundColor: Colors.background },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  item: {
    flexDirection: 'row', alignItems: 'flex-start', padding: 16, gap: 12,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  unread: { backgroundColor: '#F1F8E9' },
  unreadDot: {
    position: 'absolute', left: 6, top: 24,
    width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary,
  },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, gap: 2 },
  title: { fontSize: 15, color: Colors.text },
  titleBold: { fontWeight: '600' },
  body: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  time: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  empty: { alignItems: 'center', justifyContent: 'center', flex: 1, marginTop: 80 },
  emptyText: { fontSize: 16, color: Colors.textSecondary, marginTop: 12 },
  emptyHint: { fontSize: 13, color: Colors.textLight, marginTop: 6 },
});
