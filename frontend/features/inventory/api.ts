import { apiRequest } from '@/lib/api';

export type Batch = {
  id: number;
  tenant_id: number;
  medicine_id: number;
  medicine?: {
    id: number;
    name: string;
    sku: string;
    generic_name?: string;
  };
  batch_number: string;
  expiry_date: string;
  mfg_date?: string | null;
  cost_price: string;
  selling_price: string;
  quantity: string | number;
  is_active: boolean;
  created_at: string;
};

export type StockMovement = {
  id: number;
  tenant_id: number;
  medicine_id: number;
  medicine?: {
    id: number;
    name: string;
    sku: string;
  };
  batch_id?: number | null;
  batch?: {
    id: number;
    batch_number: string;
  } | null;
  type: string;
  quantity: string | number;
  balance_after: string | number;
  reference_type?: string | null;
  reference_id?: number | null;
  notes?: string | null;
  created_by?: number | null;
  creator?: {
    id: number;
    name: string;
  } | null;
  created_at: string;
};

export type StockAdjustmentItem = {
  id?: number;
  medicine_id: number;
  medicine?: {
    id: number;
    name: string;
    sku: string;
  };
  batch_id?: number | null;
  batch?: {
    id: number;
    batch_number: string;
  } | null;
  system_quantity: number;
  counted_quantity: number;
  difference?: number;
  unit_cost?: number;
};

export type StockAdjustment = {
  id: number;
  reference_number: string;
  reason: string;
  status: string;
  adjusted_at: string;
  created_by?: number | null;
  creator?: {
    id: number;
    name: string;
  } | null;
  items: StockAdjustmentItem[];
  created_at: string;
};

// Batches
export function getBatches(search = '', medicineId?: number) {
  const params = new URLSearchParams();
  if (search.trim()) params.append('search', search.trim());
  if (medicineId) params.append('medicine_id', String(medicineId));
  const query = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<{ data: Batch[] }>(`/batches${query}`);
}

export function createBatch(data: {
  medicine_id: number;
  batch_number: string;
  expiry_date: string;
  mfg_date?: string | null;
  cost_price: number;
  selling_price: number;
  quantity: number;
  is_active?: boolean;
}) {
  return apiRequest<{ data: Batch }>('/batches', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateBatch(
  id: number,
  data: Partial<{
    batch_number: string;
    expiry_date: string;
    mfg_date?: string | null;
    cost_price: number;
    selling_price: number;
    quantity: number;
    is_active: boolean;
  }>
) {
  return apiRequest<{ data: Batch }>(`/batches/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// Stock Movements
export function getStockMovements(medicineId?: number, type?: string) {
  const params = new URLSearchParams();
  if (medicineId) params.append('medicine_id', String(medicineId));
  if (type && type !== 'all') params.append('type', type);
  const query = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<{ data: StockMovement[] }>(`/stock-movements${query}`);
}

// Stock Adjustments
export function getStockAdjustments() {
  return apiRequest<{ data: StockAdjustment[] }>('/stock-adjustments');
}

export function createStockAdjustment(data: {
  reason: string;
  items: Array<{
    medicine_id: number;
    batch_id?: number | null;
    system_quantity: number;
    counted_quantity: number;
    unit_cost?: number;
  }>;
}) {
  return apiRequest<{ data: StockAdjustment }>('/stock-adjustments', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
