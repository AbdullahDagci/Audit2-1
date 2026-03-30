import { prisma } from '../index';

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

// Expo Push API ile bildirim gönder
async function sendPushToDevice(tokens: any[], title: string, body: string, data?: Record<string, any>): Promise<void> {
  if (tokens.length === 0) return;

  const messages: PushMessage[] = tokens.map(t => ({
    to: t.expoPushToken,
    title,
    body,
    data,
  }));

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();

    // Başarısız token'ları temizle
    if (result.data) {
      for (let i = 0; i < result.data.length; i++) {
        if (result.data[i].status === 'error' && result.data[i].details?.error === 'DeviceNotRegistered') {
          await prisma.pushToken.delete({ where: { id: tokens[i].id } }).catch(() => {});
        }
      }
    }
  } catch (error) {
    console.error('Push bildirim gönderme hatası:', error);
  }
}

// Bildirim oluştur + push gönder (tercih kontrolü ile)
export async function createAndPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> {
  // Kullanıcının tercihlerini al
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { pushNotifications: true, criticalAlerts: true, emailNotifications: true },
  });

  // Bildirim her zaman DB'ye kaydet (uygulama içi bildirim listesi için)
  await prisma.notification.create({
    data: { userId, title, body, data: data || {} },
  });

  if (!user) return;

  // Kritik bulgu bildirimi kontrolü
  const isCritical = data?.type === 'critical_findings' || data?.type === 'corrective_action_required';
  if (isCritical && !user.criticalAlerts) return;

  // Push bildirim tercihi kontrolü
  if (user.pushNotifications) {
    const tokens = await prisma.pushToken.findMany({ where: { userId } });
    await sendPushToDevice(tokens, title, body, data);
  }
}

// Email bildirim göndermeli mi kontrolü
export async function shouldSendEmailNotification(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailNotifications: true },
  });
  return user?.emailNotifications ?? true;
}
