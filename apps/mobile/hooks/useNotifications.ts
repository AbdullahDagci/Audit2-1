import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function useNotifications() {
  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user) return;

    registerForPushNotifications().then((token) => {
      if (token) savePushToken(user.id, token);
    });

    notificationListener.current = Notifications.addNotificationReceivedListener(() => {
      // Bildirim geldiginde yapilacak islem
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(() => {
      // Bildirime tiklandiginda yapilacak islem
    });

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

    const tokenData = await Notifications.getExpoPushTokenAsync();
    return tokenData.data;
  } catch {
    return null;
  }
}

async function savePushToken(userId: string, token: string) {
  await supabase.from('push_tokens').upsert({
    user_id: userId,
    expo_push_token: token,
  }, { onConflict: 'user_id,expo_push_token' });
}
