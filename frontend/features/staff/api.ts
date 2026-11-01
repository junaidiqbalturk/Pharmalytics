import { apiRequest } from '@/lib/api';

export type StaffMember = {
  id: number;
  name: string;
  email: string;
  roles: string[];
  created_at: string;
};

export type CreateStaffInput = {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'pharmacist' | 'cashier';
};

export function getStaff() {
  return apiRequest<{ data: StaffMember[] }>('/staff');
}

export function createStaff(data: CreateStaffInput) {
  return apiRequest<{ data: StaffMember }>('/staff', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function deleteStaff(id: number) {
  return apiRequest<{ message: string }>(`/staff/${id}`, {
    method: 'DELETE',
  });
}
