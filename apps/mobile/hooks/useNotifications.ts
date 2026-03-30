import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  } as Notifications.NotificationBehavior),
});

export function useNotifications() {
  const notificationListener = useRef<Notifications.EventSubscription>(null as any);
  const responseListener = useRef<Notifications.EventSubscription>(null as any);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user) return;

    registerForPushNotifications().then((token) => {
      if (token) api.savePushToken(token).catch(() => {});
    });

    notificationListener.current = Notifications.addNotificationReceivedListener((_notification) => {});
    responseListener.current = Notifications.addNotificationResponseReceivedListener((_response) => {});

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [user]);
}

async function registerForPushNotifications(): Promise<string | null> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return null;

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId: 'fe15d761-62c6-4ba0-912a-a40d5556c6ed' });
    return tokenData.data;
  } catch {
    return null;
  }
}
