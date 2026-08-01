import axios from 'axios';
import { API_URL } from '../config';
import { tokenStore } from './storage';

// Dùng CHUNG backend/API với web. Không truy cập DB trực tiếp.
export const api = axios.create({ baseURL: API_URL, timeout: 20000 });

let accessToken: string | null = null;
export function setAccessToken(t: string | null) { accessToken = t; }

api.interceptors.request.use(async (config) => {
  if (!accessToken) accessToken = (await tokenStore.get()).access;
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

let refreshing: Promise<string | null> | null = null;
async function doRefresh(): Promise<string | null> {
  const { refresh } = await tokenStore.get();
  if (!refresh) return null;
  try {
    const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken: refresh });
    await tokenStore.set(data.accessToken, data.refreshToken);
    accessToken = data.accessToken;
    return data.accessToken;
  } catch {
    await tokenStore.clear();
    accessToken = null;
    return null;
  }
}

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      refreshing = refreshing ?? doRefresh();
      const token = await refreshing;
      refreshing = null;
      if (token) { original.headers.Authorization = `Bearer ${token}`; return api(original); }
    }
    return Promise.reject(error);
  },
);

export function apiError(e: any): string {
  const d = e?.response?.data;
  if (typeof d?.message === 'string') return d.message;
  if (Array.isArray(d?.message)) return d.message.join(', ');
  if (e?.message === 'Network Error') return 'Không kết nối được máy chủ. Kiểm tra mạng / API_URL.';
  return e?.message ?? 'Đã có lỗi xảy ra';
}

/** URL đầy đủ tới media (/uploads/...). */
export function fileUrl(path?: string): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${API_URL.replace(/\/api\/?$/, '')}${path}`;
}
