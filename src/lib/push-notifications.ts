import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { supabase } from './supabase';

// Controls how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
});

const PROJECT_ID = '96f52c50-2ee0-4fc0-b8d1-98df36d375d9';

export async function registerPushToken(userId: string): Promise<string | null> {
  // Push tokens only work on real devices
  if (!Device.isDevice) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name:             'Horizon',
      importance:       Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor:       '#3B82F6',
      sound:            'default',
    });
  }

  const { status: current } = await Notifications.getPermissionsAsync();
  let finalStatus = current;

  if (current !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: PROJECT_ID });

  // Persist token so the server can send pushes to this device
  await supabase.from('profiles').update({ push_token: token }).eq('id', userId);

  return token;
}

// Call this from the root layout to handle notification taps when app is closed/background
export function setupNotificationListeners(onTap?: (data: any) => void) {
  // Notification tapped while app was in background
  const sub = Notifications.addNotificationResponseReceivedListener(response => {
    onTap?.(response.notification.request.content.data);
  });
  return () => sub.remove();
}
