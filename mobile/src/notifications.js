import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { registerDevice } from "./api";

const PENDING_DEVICE_KEY = "thinkz-pending-device-registration";

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

/** Requests permission, registers the Expo token, and returns a response listener cleanup. */
export async function configurePushNotifications({ token, onOpen }) {
  if (Platform.OS === "web") return { message: "Push notifications are available in the mobile app." };
  const existing = await Notifications.getPermissionsAsync();
  let permission = existing.status;
  if (permission !== "granted") permission = (await Notifications.requestPermissionsAsync()).status;
  if (permission !== "granted") return { message: "Notifications are off. You can enable them in phone settings." };

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", { name: "Default", importance: Notifications.AndroidImportance.DEFAULT });
  }

  const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  if (!projectId) return { message: "Notifications are enabled on this device." };
  const pushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  try {
    await registerDevice(token, { token: pushToken, platform: Platform.OS, provider: "expo" });
    await SecureStore.deleteItemAsync(PENDING_DEVICE_KEY);
    return { message: "Notifications are enabled for this device." };
  } catch (_) {
    await SecureStore.setItemAsync(PENDING_DEVICE_KEY, JSON.stringify({ token: pushToken, platform: Platform.OS, provider: "expo" }));
    return { message: "Notifications are enabled. Device registration will retry automatically." };
  }
}

export async function retryPendingDeviceRegistration(token) {
  const pending = await SecureStore.getItemAsync(PENDING_DEVICE_KEY);
  if (!pending) return false;
  await registerDevice(token, JSON.parse(pending));
  await SecureStore.deleteItemAsync(PENDING_DEVICE_KEY);
  return true;
}

export function subscribeToNotificationResponses(onOpen) {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const destination = response.notification.request.content.data?.screen;
    if (typeof destination === "string") onOpen(destination);
  });
  return () => subscription.remove();
}

export function subscribeToForegroundNotifications(onNotice) {
  const subscription = Notifications.addNotificationReceivedListener((notification) => {
    const content = notification.request.content;
    onNotice(content.title ? `${content.title}${content.body ? `: ${content.body}` : ""}` : "New Thinkz notification received.");
  });
  return () => subscription.remove();
}
