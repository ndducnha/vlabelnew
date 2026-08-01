import * as SecureStore from 'expo-secure-store';

// Lưu token an toàn (Keychain iOS / Keystore Android)
const ACCESS = 'vlabel.access';
const REFRESH = 'vlabel.refresh';

export const tokenStore = {
  async get() {
    const [access, refresh] = await Promise.all([SecureStore.getItemAsync(ACCESS), SecureStore.getItemAsync(REFRESH)]);
    return { access, refresh };
  },
  async set(access: string, refresh: string) {
    await Promise.all([SecureStore.setItemAsync(ACCESS, access), SecureStore.setItemAsync(REFRESH, refresh)]);
  },
  async clear() {
    await Promise.all([SecureStore.deleteItemAsync(ACCESS), SecureStore.deleteItemAsync(REFRESH)]);
  },
};
