import { apiRequest } from '@/lib/api';

export type Medicine = {
  id: number;
  name: string;
  generic_name: string | null;
  sku: string;
  barcode: string | null;
  strength: string | null;
  dosage_form: string | null;
  packaging_type?: string;
  is_divisible?: boolean;
  package_label?: string | null;
  reorder_level: string;
  cost_price: string;
  selling_price: string;
  tablets_per_strip?: number;
  strips_per_box?: number;
  price_per_strip?: string;
  price_per_unit?: string;
  price_per_box?: string;
  is_active: boolean;
  category: { id: number; name: string } | null;
};

export type MedicineCategory = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  is_active: boolean;
};

export type Paginated<T> = {
  data: T[];
  meta: { current_page: number; last_page: number; total: number };
};

export type CreateMedicineInput = {
  name: string;
  generic_name?: string | null;
  medicine_category_id?: number | null;
  sku: string;
  barcode?: string | null;
  strength?: string | null;
  dosage_form?: string | null;
  packaging_type?: string;
  is_divisible?: boolean;
  package_label?: string | null;
  reorder_level?: number;
  cost_price?: number;
  selling_price?: number;
  tablets_per_strip?: number;
  strips_per_box?: number;
  price_per_strip?: number;
  price_per_unit?: number;
  price_per_box?: number;
  initial_stock?: number;
  batch_number?: string;
  is_active?: boolean;
};

export type UpdateMedicineInput = Partial<CreateMedicineInput>;

export type CreateCategoryInput = {
  name: string;
  slug?: string;
  description?: string;
  is_active?: boolean;
};

export type UpdateCategoryInput = Partial<CreateCategoryInput>;

// --- Medicines ---
export function getMedicines(search = '') {
  const query = new URLSearchParams();
  if (search.trim()) query.set('search', search.trim());
  return apiRequest<Paginated<Medicine>>(`/medicines${query.size ? `?${query}` : ''}`);
}

export function createMedicine(data: CreateMedicineInput) {
  return apiRequest<{ data: Medicine }>('/medicines', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateMedicine(id: number, data: UpdateMedicineInput) {
  return apiRequest<{ data: Medicine }>(`/medicines/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteMedicine(id: number) {
  return apiRequest<void>(`/medicines/${id}`, {
    method: 'DELETE',
  });
}

// --- Categories ---
export function getMedicineCategories() {
  return apiRequest<Paginated<MedicineCategory>>('/medicine-categories');
}

export function createCategory(data: CreateCategoryInput) {
  return apiRequest<{ data: MedicineCategory }>('/medicine-categories', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateCategory(id: number, data: UpdateCategoryInput) {
  return apiRequest<{ data: MedicineCategory }>(`/medicine-categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteCategory(id: number) {
  return apiRequest<void>(`/medicine-categories/${id}`, {
    method: 'DELETE',
  });
}
