import { Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { apiData } from '@/api/http';

Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }) });

/** Requests permission and stores the physical-device token on the LMS API. */
export async function registerPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null;
  const current = await Notifications.getPermissionsAsync();
  const final = current.status === 'granted' ? current : await Notifications.requestPermissionsAsync();
  if (final.status !== 'granted') return null;
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('default', { name: 'Default', importance: Notifications.AndroidImportance.DEFAULT });
  const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
  const token = projectId ? (await Notifications.getExpoPushTokenAsync({ projectId })).data : (await Notifications.getExpoPushTokenAsync()).data;
  await apiData('/notifications/device-token', { method: 'PUT', body: { expoPushToken: token, platform: Platform.OS } });
  return token;
}

/** Route notification taps through the existing app deep-link listener. */
export function subscribeToNotificationDeepLinks(): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const url = response.notification.request.content.data?.url;
    if (typeof url === 'string' && url.startsWith('thinkzai://')) void Linking.openURL(url);
  });
  return () => subscription.remove();
}
