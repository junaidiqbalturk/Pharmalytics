import { apiRequest } from '@/lib/api';
import { TenantInfo, UserInfo } from '@/stores/auth-store';

export type AuthResponse = {
  data: {
    access_token: string;
    token_type: string;
    user: UserInfo;
    tenant?: TenantInfo;
    tenants?: TenantInfo[];
    default_tenant_id?: number | null;
  };
};

export type MeResponse = {
  data: {
    user: UserInfo;
    tenants: TenantInfo[];
  };
};

export type RegistrationInput = {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  device_name?: string;
  tenant: {
    name: string;
    currency_code: string;
    timezone?: string;
  };
};

export function login(input: { email: string; password: string; device_name?: string }) {
  return apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function register(input: RegistrationInput) {
  return apiRequest<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function getMe() {
  return apiRequest<MeResponse>('/auth/me', {
    method: 'GET',
  });
}

export function logout() {
  return apiRequest<{ message: string }>('/auth/logout', {
    method: 'POST',
  });
}
