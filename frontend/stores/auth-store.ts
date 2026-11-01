import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type TenantInfo = {
  id: number;
  name: string;
  slug?: string;
  currency_code?: string;
  country_code?: string;
  country?: string;
  timezone?: string;
};

export type UserInfo = {
  id: number;
  name: string;
  email: string;
  roles?: string[];
  permissions?: string[];
};

type AuthState = {
  accessToken: string | null;
  tenantId: number | null;
  tenants: TenantInfo[];
  user: UserInfo | null;
  setSession: (session: {
    accessToken: string;
    tenantId: number;
    user: UserInfo;
    tenants?: TenantInfo[];
  }) => void;
  switchTenant: (tenantId: number) => void;
  clearSession: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      tenantId: null,
      tenants: [],
      user: null,
      setSession: ({ accessToken, tenantId, user, tenants = [] }) =>
        set({ accessToken, tenantId, user, tenants }),
      switchTenant: (tenantId) => set({ tenantId }),
      clearSession: () => set({ accessToken: null, tenantId: null, tenants: [], user: null }),
    }),
    {
      name: 'pharmalytics-session',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
