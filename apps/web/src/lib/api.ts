import axios from 'axios';

const BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:4000/api';

export const tokenStore = {
  get access() { return localStorage.getItem('vlabel.access'); },
  get refresh() { return localStorage.getItem('vlabel.refresh'); },
  set(access: string, refresh: string) {
    localStorage.setItem('vlabel.access', access);
    localStorage.setItem('vlabel.refresh', refresh);
  },
  clear() {
    localStorage.removeItem('vlabel.access');
    localStorage.removeItem('vlabel.refresh');
  },
};

export const api = axios.create({ baseURL: BASE });

api.interceptors.request.use((config) => {
  const t = tokenStore.access;
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

let refreshing: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  const rt = tokenStore.refresh;
  if (!rt) return null;
  try {
    const { data } = await axios.post(`${BASE}/auth/refresh`, { refreshToken: rt });
    tokenStore.set(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch {
    tokenStore.clear();
    return null;
  }
}

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry && tokenStore.refresh) {
      original._retry = true;
      refreshing = refreshing ?? doRefresh();
      const token = await refreshing;
      refreshing = null;
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  },
);

/** URL đầy đủ tới file media do API phục vụ (/uploads/...). */
export function fileUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${BASE.replace(/\/api\/?$/, '')}${path}`;
}

/** Trích thông điệp lỗi thân thiện từ response. */
export function apiError(e: any): string {
  const d = e?.response?.data;
  if (typeof d?.message === 'string') return d.message;
  if (Array.isArray(d?.message)) return d.message.join(', ');
  return e?.message ?? 'Đã có lỗi xảy ra';
}
