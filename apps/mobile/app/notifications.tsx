import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';

const mockNotifications = [
  { id: '1', title: 'Kritik Bulgu!', body: 'Merkez Magaza - Tezgahlar temiz degil', time: '10 dk once', read: false, type: 'critical' },
  { id: '2', title: 'Denetim Hatırlatması', body: 'Kesimhane denetimi bugun yapılmalı', time: '1 saat önce', read: false, type: 'reminder' },
  { id: '3', title: 'Denetim Tamamlandi', body: 'Ana Depo denetimi incelendi - Puan: 91', time: '2 saat önce', read: true, type: 'info' },
  { id: '4', title: 'Geciken Denetim', body: 'Ahir - Merkez denetimi 2 gun gecikti', time: 'Dun', read: true, type: 'overdue' },
  { id: '5', title: 'Denetim Tamamlandi', body: 'Yufka Uretim denetimi gönderildi', time: '2 gün önce', read: true, type: 'info' },
];

const typeIcons: Record<string, { name: keyof typeof MaterialIcons.glyphMap; color: string }> = {
  critical: { name: 'warning', color: Colors.danger },
  reminder: { name: 'alarm', color: Colors.secondary },
  info: { name: 'check-circle', color: Colors.success },
  overdue: { name: 'schedule', color: Colors.danger },
};

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState(mockNotifications);

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  return (
    <FlatList
      data={notifications}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => {
        const icon = typeIcons[item.type] || typeIcons.info;
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
              <Text style={styles.time}>{item.time}</Text>
            </View>
          </TouchableOpacity>
        );
      }}
      contentContainerStyle={styles.list}
      ListEmptyComponent={
        <View style={styles.empty}>
          <MaterialIcons name="notifications-none" size={48} color={Colors.textLight} />
          <Text style={styles.emptyText}>Bildirim yok</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { backgroundColor: Colors.background },
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
  empty: { alignItems: 'center', marginTop: 80 },
  emptyText: { fontSize: 16, color: Colors.textSecondary, marginTop: 12 },
});
