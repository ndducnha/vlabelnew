import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { api } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: true }),
});

/**
 * Xin quyền + lấy Expo push token, đăng ký với backend (nếu có endpoint).
 * Backend cần bổ sung (additive): POST /devices/register { token, platform }
 * để gửi push khi: giao việc mới, gần/quá hạn, duyệt/từ chối, yêu cầu bổ sung.
 */
export async function registerForPush(): Promise<string | null> {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', { name: 'default', importance: Notifications.AndroidImportance.HIGH });
    }
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    try { await api.post('/devices/register', { token, platform: Platform.OS }); } catch { /* endpoint có thể chưa tồn tại */ }
    return token;
  } catch { return null; }
}
