import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setAccessToken } from './api';
import { tokenStore } from './storage';

export interface Me {
  id: string; email: string; fullName: string; tenantId: string; organizationId?: string;
  roles: string[]; permissions: string[]; scopeOrgIds?: string[];
}

interface AuthCtx {
  user: Me | null; loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  can: (perm: string) => boolean;
  isManager: boolean;
}

const Ctx = createContext<AuthCtx>(null as any);
export const useAuth = () => useContext(Ctx);

// Quyền suy ra từ backend (giống web)
const FLOW_MANAGE = 'flow:manage';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    try { const { data } = await api.get('/auth/me'); setUser(data); }
    catch { setUser(null); }
  }, []);

  useEffect(() => {
    (async () => {
      const { access } = await tokenStore.get();
      if (access) { setAccessToken(access); await refreshMe(); }
      setLoading(false);
    })();
  }, [refreshMe]);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    await tokenStore.set(data.accessToken, data.refreshToken);
    setAccessToken(data.accessToken);
    await refreshMe();
  }, [refreshMe]);

  const logout = useCallback(async () => {
    const { refresh } = await tokenStore.get();
    try { await api.post('/auth/logout', { refreshToken: refresh }); } catch { /* ignore */ }
    await tokenStore.clear();
    setAccessToken(null);
    setUser(null);
  }, []);

  const can = useCallback((perm: string) => !!user?.permissions.includes(perm), [user]);
  const isManager = !!user?.permissions.includes(FLOW_MANAGE);

  return <Ctx.Provider value={{ user, loading, login, logout, refreshMe, can, isManager }}>{children}</Ctx.Provider>;
}

export const PERMISSIONS = {
  PRODUCT_READ: 'product:read', PRODUCT_CREATE: 'product:create', PRODUCT_UPDATE: 'product:update',
  FLOW_MANAGE: 'flow:manage', EVENT_RECORD_CREATE: 'event_record:create', EVENT_RECORD_SUBMIT: 'event_record:submit',
  EVENT_RECORD_APPROVE: 'event_record:approve', USER_MANAGE: 'user:manage',
};
