import { ExpoConfig } from 'expo/config';

// Cấu hình môi trường: development | staging | production
const APP_ENV = (process.env.APP_ENV ?? 'development') as 'development' | 'staging' | 'production';

// Với thiết bị thật/emulator, "localhost" KHÔNG trỏ tới máy backend.
// Đặt API_URL = http://<địa-chỉ-LAN-của-máy>:4000/api (xem README).
const API_URL: Record<typeof APP_ENV, string> = {
  development: process.env.API_URL ?? 'http://192.168.1.10:4000/api',
  staging: process.env.API_URL ?? 'https://staging.vlabel.vn/api',
  production: process.env.API_URL ?? 'https://api.vlabel.vn/api',
};

const config: ExpoConfig = {
  name: APP_ENV === 'production' ? 'VLabel' : `VLabel (${APP_ENV})`,
  slug: 'vlabel-mobile',
  scheme: 'vlabel',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic', // hỗ trợ dark mode theo hệ thống
  icon: './assets/logo.jpg',
  splash: { image: './assets/logo.jpg', backgroundColor: '#2E5BE8', resizeMode: 'contain' },
  assetBundlePatterns: ['**/*'],
  ios: { supportsTablet: true, bundleIdentifier: 'vn.vlabel.mobile', infoPlist: { NSCameraUsageDescription: 'Quét mã QR và chụp ảnh minh chứng khai báo.', NSPhotoLibraryUsageDescription: 'Chọn ảnh minh chứng từ thư viện.', NSLocationWhenInUseUsageDescription: 'Chọn vị trí thực hiện Event trên bản đồ.' } },
  android: {
    package: 'vn.vlabel.mobile',
    permissions: ['CAMERA', 'READ_EXTERNAL_STORAGE', 'ACCESS_FINE_LOCATION'],
    adaptiveIcon: { backgroundColor: '#2E5BE8' },
  },
  plugins: [
    'expo-secure-store',
    ['expo-camera', { cameraPermission: 'VLabel cần camera để quét QR và chụp ảnh khai báo.' }],
    ['expo-image-picker', { photosPermission: 'VLabel cần truy cập thư viện để đính kèm ảnh.' }],
  ],
  extra: {
    apiUrl: API_URL[APP_ENV],
    appEnv: APP_ENV,
  },
};

export default config;
