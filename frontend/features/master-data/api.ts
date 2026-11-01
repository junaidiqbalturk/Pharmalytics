import { apiRequest } from '@/lib/api';

export type Supplier = {
  id: number;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  tax_number: string | null;
  payment_terms_days: number;
  is_active: boolean;
  created_at: string;
};

export type Customer = {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  loyalty_code: string | null;
  credit_limit: string;
  balance: string;
  is_active: boolean;
  created_at: string;
};

export type Manufacturer = {
  id: number;
  name: string;
  country: string | null;
  is_active: boolean;
  created_at: string;
};

export type UnitOfMeasurement = {
  id: number;
  name: string;
  code: string;
  is_active: boolean;
  created_at: string;
};

// Suppliers API
export function getSuppliers(search = '') {
  const q = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
  return apiRequest<{ data: Supplier[] }>(`/suppliers${q}`);
}

export function createSupplier(data: Partial<Supplier>) {
  return apiRequest<{ data: Supplier }>('/suppliers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateSupplier(id: number, data: Partial<Supplier>) {
  return apiRequest<{ data: Supplier }>(`/suppliers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteSupplier(id: number) {
  return apiRequest<{ message: string }>(`/suppliers/${id}`, {
    method: 'DELETE',
  });
}

// Customers API
export function getCustomers(search = '') {
  const q = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
  return apiRequest<{ data: Customer[] }>(`/customers${q}`);
}

export function createCustomer(data: Partial<Customer>) {
  return apiRequest<{ data: Customer }>('/customers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateCustomer(id: number, data: Partial<Customer>) {
  return apiRequest<{ data: Customer }>(`/customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteCustomer(id: number) {
  return apiRequest<{ message: string }>(`/customers/${id}`, {
    method: 'DELETE',
  });
}

// Manufacturers API
export function getManufacturers(search = '') {
  const q = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
  return apiRequest<{ data: Manufacturer[] }>(`/manufacturers${q}`);
}

export function createManufacturer(data: Partial<Manufacturer>) {
  return apiRequest<{ data: Manufacturer }>('/manufacturers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateManufacturer(id: number, data: Partial<Manufacturer>) {
  return apiRequest<{ data: Manufacturer }>(`/manufacturers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteManufacturer(id: number) {
  return apiRequest<{ message: string }>(`/manufacturers/${id}`, {
    method: 'DELETE',
  });
}

// Units of Measurement API
export function getUnitsOfMeasurement(search = '') {
  const q = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
  return apiRequest<{ data: UnitOfMeasurement[] }>(`/units-of-measurement${q}`);
}

export function createUnitOfMeasurement(data: Partial<UnitOfMeasurement>) {
  return apiRequest<{ data: UnitOfMeasurement }>('/units-of-measurement', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateUnitOfMeasurement(id: number, data: Partial<UnitOfMeasurement>) {
  return apiRequest<{ data: UnitOfMeasurement }>(`/units-of-measurement/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteUnitOfMeasurement(id: number) {
  return apiRequest<{ message: string }>(`/units-of-measurement/${id}`, {
    method: 'DELETE',
  });
}
