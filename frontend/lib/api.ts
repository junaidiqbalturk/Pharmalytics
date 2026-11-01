import { useAuthStore } from '@/stores/auth-store';

const apiRoot = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().accessToken;
  const tenantId = useAuthStore.getState().tenantId;
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');

  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (tenantId) headers.set('X-Tenant-ID', String(tenantId));

  const response = await fetch(`${apiRoot}${path.startsWith('/') ? path : `/${path}`}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      useAuthStore.getState().clearSession();
    }
    const payload = await response.json().catch(() => null) as { message?: string } | null;
    throw new ApiError(response.status, payload?.message ?? 'The request could not be completed.');
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
