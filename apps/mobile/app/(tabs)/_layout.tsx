import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/auth-store';

export default function TabsLayout() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2E7D32',
        tabBarInactiveTintColor: '#9E9E9E',
        headerStyle: { backgroundColor: '#FFFFFF' },
        headerTintColor: '#2E7D32',
        headerTitleStyle: { fontWeight: '600', fontSize: 18 },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginBottom: Platform.OS === 'ios' ? 0 : 4,
        },
        tabBarIconStyle: {
          marginTop: Platform.OS === 'ios' ? 6 : 2,
        },
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E8E8E8',
          height: Platform.OS === 'ios' ? 88 : 65,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 6,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Ana Sayfa',
          tabBarIcon: ({ color }) => <MaterialIcons name="home" size={26} color={color} />,
        }}
      />
      <Tabs.Screen
        name="inspections"
        options={{
          title: 'Denetimler',
          tabBarIcon: ({ color }) => <MaterialIcons name="assignment" size={26} color={color} />,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Takvim',
          tabBarIcon: ({ color }) => <MaterialIcons name="event" size={26} color={color} />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          href: null, // Tab bar'dan gizle
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Yönetim',
          tabBarIcon: ({ color }) => <MaterialIcons name="admin-panel-settings" size={26} color={color} />,
          href: isAdmin ? '/admin' : null, // Denetçi için gizle
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => <MaterialIcons name="person" size={26} color={color} />,
        }}
      />
    </Tabs>
  );
}
