import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? {}) as { apiUrl?: string; appEnv?: string };

/** Base URL của backend dùng chung với web (mặc định /api). */
export const API_URL = extra.apiUrl ?? 'http://192.168.1.10:4000/api';
export const APP_ENV = extra.appEnv ?? 'development';
