import { apiRequest } from '@/lib/api';

export type PurchaseOrderItem = {
  id?: number;
  medicine_id: number;
  medicine?: {
    id: number;
    name: string;
    sku: string;
  };
  quantity_ordered: number;
  quantity_received?: number;
  unit_price: number;
  subtotal: number;
};

export type PurchaseOrder = {
  id: number;
  tenant_id: number;
  supplier_id: number;
  supplier?: {
    id: number;
    name: string;
    phone?: string | null;
    email?: string | null;
  };
  po_number: string;
  order_date: string;
  expected_date?: string | null;
  status: 'draft' | 'ordered' | 'received' | 'partially_received' | 'cancelled';
  total_amount: string | number;
  notes?: string | null;
  created_by?: number | null;
  creator?: {
    id: number;
    name: string;
  } | null;
  items: PurchaseOrderItem[];
  created_at: string;
};

export type GoodsReceiptItem = {
  id?: number;
  medicine_id: number;
  medicine?: {
    id: number;
    name: string;
    sku: string;
  };
  batch_number: string;
  expiry_date: string;
  quantity_received: number;
  unit_cost: number;
  selling_price: number;
  subtotal: number;
};

export type GoodsReceipt = {
  id: number;
  tenant_id: number;
  purchase_order_id?: number | null;
  supplier_id: number;
  supplier?: {
    id: number;
    name: string;
  };
  grn_number: string;
  invoice_number?: string | null;
  received_date: string;
  total_amount: string | number;
  payment_status: string;
  notes?: string | null;
  created_by?: number | null;
  creator?: {
    id: number;
    name: string;
  } | null;
  items: GoodsReceiptItem[];
  created_at: string;
};

// Purchase Orders
export function getPurchaseOrders(status?: string) {
  const params = new URLSearchParams();
  if (status && status !== 'all') params.append('status', status);
  const query = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<{ data: PurchaseOrder[] }>(`/purchase-orders${query}`);
}

export function createPurchaseOrder(data: {
  supplier_id: number;
  order_date: string;
  expected_date?: string | null;
  notes?: string | null;
  items: Array<{
    medicine_id: number;
    quantity_ordered: number;
    unit_price: number;
  }>;
}) {
  return apiRequest<{ data: PurchaseOrder }>('/purchase-orders', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updatePurchaseOrderStatus(
  id: number,
  data: {
    status: 'draft' | 'ordered' | 'cancelled';
    notes?: string | null;
  }
) {
  return apiRequest<{ data: PurchaseOrder }>(`/purchase-orders/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// Goods Receipts (GRN)
export function getGoodsReceipts() {
  return apiRequest<{ data: GoodsReceipt[] }>('/goods-receipts');
}

export function createGoodsReceipt(data: {
  purchase_order_id?: number | null;
  supplier_id: number;
  invoice_number?: string | null;
  received_date: string;
  notes?: string | null;
  items: Array<{
    medicine_id: number;
    batch_number: string;
    expiry_date: string;
    quantity_received: number;
    unit_cost: number;
    selling_price: number;
  }>;
}) {
  return apiRequest<{ data: GoodsReceipt }>('/goods-receipts', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
