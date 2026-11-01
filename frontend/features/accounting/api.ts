import { apiRequest } from '@/lib/api';

export type ChartOfAccount = {
  id: number;
  tenant_id: number;
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  is_system: boolean;
  is_active: boolean;
  created_at: string;
};

export type JournalEntryItem = {
  id?: number;
  chart_of_account_id: number;
  account?: {
    id: number;
    code: string;
    name: string;
    type: string;
  };
  type: 'debit' | 'credit';
  amount: string | number;
  description?: string | null;
};

export type JournalEntry = {
  id: number;
  tenant_id: number;
  entry_number: string;
  date: string;
  description: string;
  reference_type?: string | null;
  reference_id?: number | null;
  status: string;
  created_by?: number | null;
  creator?: {
    id: number;
    name: string;
  } | null;
  items: JournalEntryItem[];
  created_at: string;
};

export type LedgerTransaction = {
  id: number;
  entry_number: string;
  date: string;
  description: string;
  debit: string | null;
  credit: string | null;
  running_balance: string;
};

export type LedgerResponse = {
  data: {
    account_id: number;
    final_balance: string;
    transactions: LedgerTransaction[];
  };
};

// Chart of Accounts
export function getChartOfAccounts(search = '', type = '') {
  const params = new URLSearchParams();
  if (search.trim()) params.append('search', search.trim());
  if (type && type !== 'all') params.append('type', type);
  const query = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<{ data: ChartOfAccount[] }>(`/chart-of-accounts${query}`);
}

export function createChartOfAccount(data: {
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  is_active?: boolean;
}) {
  return apiRequest<{ data: ChartOfAccount }>('/chart-of-accounts', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateChartOfAccount(
  id: number,
  data: Partial<{
    code: string;
    name: string;
    type: string;
    is_active: boolean;
  }>
) {
  return apiRequest<{ data: ChartOfAccount }>(`/chart-of-accounts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteChartOfAccount(id: number) {
  return apiRequest<void>(`/chart-of-accounts/${id}`, {
    method: 'DELETE',
  });
}

// Journal Entries
export function getJournalEntries() {
  return apiRequest<{ data: JournalEntry[] }>('/journal-entries');
}

export function createJournalEntry(data: {
  date: string;
  description: string;
  reference_type?: string | null;
  reference_id?: number | null;
  items: Array<{
    chart_of_account_id: number;
    type: 'debit' | 'credit';
    amount: number;
    description?: string | null;
  }>;
}) {
  return apiRequest<{ data: JournalEntry }>('/journal-entries', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// General Ledger
export function getAccountLedger(accountId: number) {
  return apiRequest<LedgerResponse>(`/accounts/${accountId}/ledger`);
}
