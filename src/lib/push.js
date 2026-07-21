// localpulse/app/src/lib/push.js
import Constants from 'expo-constants';
import { api } from '../api/client.js';

// expo-notifications' push APIs were removed from Expo Go in SDK 53. A static
// `import * as Notifications from 'expo-notifications'` is evaluated when THIS
// module loads (via RootNavigator), which throws in Expo Go before any of our
// guards run. So we detect Expo Go and lazy-require the native modules only
// outside it — merely importing push.js then touches nothing native in Expo Go.
// Push works normally in dev/production builds.
const isExpoGo = Constants.appOwnership === 'expo';

// Lazy handles, loaded once on first real use (never in Expo Go).
let Notifications = null;
let Device = null;
function loadNativeModules() {
  if (isExpoGo) return false;
  if (!Notifications) Notifications = require('expo-notifications');
  if (!Device) Device = require('expo-device');
  return true;
}

// Show notifications while the app is foregrounded. Set the handler lazily (and
// only outside Expo Go) so merely importing this module doesn't touch the
// native notifications API in Expo Go.
let handlerSet = false;
function ensureHandler() {
  if (handlerSet || isExpoGo || !Notifications) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
  handlerSet = true;
}

// Ask permission, get the Expo push token, and register it with the backend.
// Returns the token, or null if unavailable (Expo Go, simulator, denied, etc.).
export async function registerForPush() {
  if (isExpoGo) return null;          // push APIs unavailable in Expo Go (SDK 53+)
  if (!loadNativeModules()) return null;
  if (!Device.isDevice) return null;  // push doesn't work on simulators

  ensureHandler();

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (existing !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== 'granted') return null;

  try {
    const projectId = Constants?.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const token = tokenData.data;
    await api.registerPush(token);
    return token;
  } catch {
    return null;
  }
}