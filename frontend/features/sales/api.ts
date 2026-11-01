import { apiRequest } from '@/lib/api';

export type PosProduct = {
  id: number;
  name: string;
  generic_name: string | null;
  sku: string;
  barcode: string | null;
  strength: string | null;
  dosage_form: string | null;
  selling_price: string;
  tablets_per_strip: number;
  strips_per_box: number;
  price_per_strip: string;
  price_per_unit: string;
  price_per_box: string;
  default_batch_id: number | null;
  default_batch_number: string | null;
  default_expiry_date: string | null;
  total_stock: string;
  in_stock: boolean;
};

export type CartItem = {
  medicine: PosProduct;
  quantity: number;
  unitType: 'strip' | 'unit' | 'box';
  unitPrice: number;
  discount: number;
};

export type CheckoutInput = {
  customer_id?: number | null;
  discount_amount?: number;
  tax_amount?: number;
  paid_amount: number;
  payment_method: 'cash' | 'card' | 'mobile_money' | 'credit';
  items: Array<{
    medicine_id: number;
    batch_id?: number | null;
    quantity: number;
    unit_type?: 'strip' | 'unit' | 'box';
    unit_price: number;
    discount?: number;
  }>;
};

export type SaleRecord = {
  id: number;
  invoice_number: string;
  customer_id: number | null;
  customer_name: string | null;
  subtotal: string;
  discount_amount: string;
  tax_amount: string;
  total_amount: string;
  paid_amount: string;
  change_amount: string;
  payment_method: string;
  status: string;
  server_name: string | null;
  items: Array<{
    id: number;
    medicine_id: number;
    medicine_name: string;
    batch_id: number | null;
    batch_number: string | null;
    quantity: string;
    unit_type?: string;
    unit_price: string;
    discount: string;
    subtotal: string;
  }>;
  created_at: string;
};

export function getPosProducts(search = '') {
  const query = new URLSearchParams();
  if (search.trim()) query.set('search', search.trim());
  return apiRequest<{ data: PosProduct[] }>(`/pos/products${query.size ? `?${query}` : ''}`);
}

export function checkout(data: CheckoutInput) {
  return apiRequest<{ data: SaleRecord }>('/pos/checkout', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getSales(search = '') {
  const query = new URLSearchParams();
  if (search.trim()) query.set('search', search.trim());
  return apiRequest<{ data: SaleRecord[]; meta?: { total: number } }>(`/sales${query.size ? `?${query}` : ''}`);
}

export function getSale(id: number) {
  return apiRequest<{ data: SaleRecord }>(`/sales/${id}`);
}
