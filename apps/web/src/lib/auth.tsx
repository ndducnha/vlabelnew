import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, tokenStore } from './api';

export interface Me {
  id: string; email: string; fullName: string;
  tenantId: string; organizationId: string | null;
  roles: string[]; permissions: string[]; scopeOrgIds?: string[];
}

interface AuthCtx {
  user: Me | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  can: (perm: string) => boolean;
}

const Ctx = createContext<AuthCtx>(null as any);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tokenStore.access) { setLoading(false); return; }
    api.get('/auth/me')
      .then((r) => setUser(r.data))
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    tokenStore.set(data.accessToken, data.refreshToken);
    setUser(data.user);
  };

  const logout = () => {
    const rt = tokenStore.refresh;
    if (rt) api.post('/auth/logout', { refreshToken: rt }).catch(() => {});
    tokenStore.clear();
    setUser(null);
  };

  const can = (perm: string) => !!user?.permissions.includes(perm);

  return <Ctx.Provider value={{ user, loading, login, logout, can }}>{children}</Ctx.Provider>;
}
