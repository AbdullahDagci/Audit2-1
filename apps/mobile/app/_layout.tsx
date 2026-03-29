import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { useAuthStore } from '@/stores/auth-store';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, initialize } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (isLoading) return;
    const inAuth = segments[0] === '(auth)';
    if (!isAuthenticated && !inAuth) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuth) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' }}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <AuthGuard>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTintColor: '#2E7D32',
          headerTitleStyle: { fontWeight: '600' },
          headerBackTitle: 'Geri',
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="inspection/new" options={{ title: 'Yeni Denetim' }} />
        <Stack.Screen name="inspection/[id]" options={{ title: 'Denetim' }} />
        <Stack.Screen name="inspection/summary" options={{ title: 'Denetim Ozeti' }} />
        <Stack.Screen name="inspection/review" options={{ title: 'Denetim Inceleme', presentation: 'card' }} />
        <Stack.Screen name="inspection/corrective-actions" options={{ title: 'Düzeltici Faaliyetler', headerShown: false }} />
        <Stack.Screen name="inspection/tutanak" options={{ title: 'Tutanak', headerShown: false }} />
        <Stack.Screen name="template/[id]" options={{ title: 'Denetim Maddeleri' }} />
        <Stack.Screen name="notifications" options={{ title: 'Bildirimler' }} />
        <Stack.Screen name="settings" options={{ title: 'Ayarlar' }} />
      </Stack>
    </AuthGuard>
  );
}
