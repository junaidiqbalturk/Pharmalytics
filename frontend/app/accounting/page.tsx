'use client';

import { useState } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Grid,
  Group,
  Modal,
  NumberInput,
  Paper,
  SegmentedControl,
  Select,
  Stack,
  Switch,
  Table,
  Tabs,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { useDebouncedValue, useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconAlertCircle,
  IconBuildingBank,
  IconCheck,
  IconCoins,
  IconCreditCard,
  IconEdit,
  IconEye,
  IconFileSpreadsheet,
  IconListDetails,
  IconPlus,
  IconReceipt2,
  IconScale,
  IconSearch,
  IconTrash,
} from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppShell } from '@/components/app-shell';
import {
  ChartOfAccount,
  JournalEntry,
  createChartOfAccount,
  createJournalEntry,
  getAccountLedger,
  getChartOfAccounts,
  getJournalEntries,
  updateChartOfAccount,
} from '@/features/accounting/api';
import { useAuthStore } from '@/stores/auth-store';

export default function AccountingPage() {
  const queryClient = useQueryClient();
  const { tenantId, tenants } = useAuthStore();
  const currentTenant = tenants.find((t) => t.id === tenantId);
  const currency = currentTenant?.currency_code || 'PKR';

  const [activeTab, setActiveTab] = useState<string | null>('accounts');
  const [accountSearch, setAccountSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(accountSearch, 300);
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Ledger state
  const [selectedLedgerAccountId, setSelectedLedgerAccountId] = useState<string>('');

  // Modals
  const [accountModalOpened, { open: openAccountModal, close: closeAccountModal }] = useDisclosure(false);
  const [editingAccount, setEditingAccount] = useState<ChartOfAccount | null>(null);

  const [entryModalOpened, { open: openEntryModal, close: closeEntryModal }] = useDisclosure(false);
  const [detailModalOpened, { open: openDetailModal, close: closeDetailModal }] = useDisclosure(false);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);

  // Queries
  const { data: accountsData, isLoading: isLoadingAccounts } = useQuery({
    queryKey: ['chart-of-accounts', debouncedSearch, typeFilter],
    queryFn: () => getChartOfAccounts(debouncedSearch, typeFilter),
  });

  const { data: entriesData, isLoading: isLoadingEntries } = useQuery({
    queryKey: ['journal-entries'],
    queryFn: () => getJournalEntries(),
  });

  const { data: ledgerData, isLoading: isLoadingLedger } = useQuery({
    queryKey: ['account-ledger', selectedLedgerAccountId],
    queryFn: () => getAccountLedger(Number(selectedLedgerAccountId)),
    enabled: Boolean(selectedLedgerAccountId),
  });

  const accounts = accountsData?.data || [];
  const entries = entriesData?.data || [];
  const ledger = ledgerData?.data;

  // Account Form State
  const [accountForm, setAccountForm] = useState({
    code: '',
    name: '',
    type: 'asset' as 'asset' | 'liability' | 'equity' | 'revenue' | 'expense',
    is_active: true,
  });

  // Journal Entry Form State
  const [entryForm, setEntryForm] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    reference_type: '',
    items: [
      {
        chart_of_account_id: '',
        type: 'debit' as 'debit' | 'credit',
        amount: 100,
        description: '',
      },
      {
        chart_of_account_id: '',
        type: 'credit' as 'debit' | 'credit',
        amount: 100,
        description: '',
      },
    ],
  });

  // Mutations
  const createAccountMutation = useMutation({
    mutationFn: (data: any) => createChartOfAccount(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      notifications.show({
        title: 'Account Created',
        message: 'Account added to Chart of Accounts.',
        color: 'teal',
        icon: <IconCheck size={18} />,
      });
      closeAccountModal();
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Failed to Create Account',
        message: err?.message || 'Check account code and title.',
        color: 'red',
      });
    },
  });

  const updateAccountMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateChartOfAccount(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      notifications.show({
        title: 'Account Updated',
        message: 'Account modified successfully.',
        color: 'teal',
        icon: <IconCheck size={18} />,
      });
      closeAccountModal();
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Update Failed',
        message: err?.message || 'Could not update account.',
        color: 'red',
      });
    },
  });

  const createEntryMutation = useMutation({
    mutationFn: (data: any) => createJournalEntry(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['account-ledger'] });
      notifications.show({
        title: 'Journal Entry Posted',
        message: 'Balanced transaction posted to general ledger.',
        color: 'teal',
        icon: <IconCheck size={18} />,
      });
      closeEntryModal();
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Posting Failed',
        message: err?.message || 'Double entry must balance.',
        color: 'red',
      });
    },
  });

  // Handlers for Account
  const handleOpenAddAccount = () => {
    setEditingAccount(null);
    setAccountForm({
      code: '',
      name: '',
      type: 'expense',
      is_active: true,
    });
    openAccountModal();
  };

  const handleOpenEditAccount = (acc: ChartOfAccount) => {
    setEditingAccount(acc);
    setAccountForm({
      code: acc.code,
      name: acc.name,
      type: acc.type,
      is_active: acc.is_active,
    });
    openAccountModal();
  };

  const handleSaveAccount = () => {
    if (!accountForm.code || !accountForm.name) {
      notifications.show({ title: 'Validation Error', message: 'Code and account name are required.', color: 'red' });
      return;
    }

    if (editingAccount) {
      updateAccountMutation.mutate({
        id: editingAccount.id,
        data: accountForm,
      });
    } else {
      createAccountMutation.mutate(accountForm);
    }
  };

  // Handlers for Journal Entry
  const handleOpenCreateEntry = () => {
    const cashAccount = accounts.find((a) => a.code === '1010') || accounts[0];
    const revenueAccount = accounts.find((a) => a.code === '4010') || accounts[1];

    setEntryForm({
      date: new Date().toISOString().split('T')[0],
      description: '',
      reference_type: 'Manual Journal',
      items: [
        {
          chart_of_account_id: cashAccount ? String(cashAccount.id) : '',
          type: 'debit',
          amount: 500,
          description: '',
        },
        {
          chart_of_account_id: revenueAccount ? String(revenueAccount.id) : '',
          type: 'credit',
          amount: 500,
          description: '',
        },
      ],
    });
    openEntryModal();
  };

  const handleAddEntryLine = () => {
    setEntryForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          chart_of_account_id: accounts[0] ? String(accounts[0].id) : '',
          type: 'debit',
          amount: 0,
          description: '',
        },
      ],
    }));
  };

  const handleRemoveEntryLine = (index: number) => {
    setEntryForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleUpdateEntryLine = (index: number, field: string, val: any) => {
    setEntryForm((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: val };
      return { ...prev, items };
    });
  };

  // Double Entry Balance Calculations
  const totalDebits = entryForm.items
    .filter((it) => it.type === 'debit')
    .reduce((acc, it) => acc + (Number(it.amount) || 0), 0);

  const totalCredits = entryForm.items
    .filter((it) => it.type === 'credit')
    .reduce((acc, it) => acc + (Number(it.amount) || 0), 0);

  const diffBalance = Math.abs(totalDebits - totalCredits);
  const isBalanced = Math.round(totalDebits * 100) === Math.round(totalCredits * 100) && totalDebits > 0;

  const handleSubmitEntry = () => {
    if (!entryForm.description.trim()) {
      notifications.show({ title: 'Validation Error', message: 'Description/Memo is required.', color: 'red' });
      return;
    }
    if (!isBalanced) {
      notifications.show({
        title: 'Unbalanced Entry',
        message: 'Total Debits must exactly equal Total Credits before posting.',
        color: 'red',
      });
      return;
    }
    const hasInvalidLine = entryForm.items.some((it) => !it.chart_of_account_id || Number(it.amount) <= 0);
    if (hasInvalidLine) {
      notifications.show({
        title: 'Invalid Line Items',
        message: 'All lines must select an account and have an amount greater than 0.',
        color: 'red',
      });
      return;
    }

    createEntryMutation.mutate({
      date: entryForm.date,
      description: entryForm.description,
      reference_type: entryForm.reference_type || null,
      items: entryForm.items.map((it) => ({
        chart_of_account_id: Number(it.chart_of_account_id),
        type: it.type,
        amount: Number(it.amount),
        description: it.description || null,
      })),
    });
  };

  // Helper for Account Type Badges
  const getAccountTypeBadge = (type: string) => {
    switch (type) {
      case 'asset':
        return <Badge color="blue" variant="light">ASSET</Badge>;
      case 'liability':
        return <Badge color="orange" variant="light">LIABILITY</Badge>;
      case 'equity':
        return <Badge color="grape" variant="light">EQUITY</Badge>;
      case 'revenue':
        return <Badge color="teal" variant="light">REVENUE</Badge>;
      case 'expense':
        return <Badge color="red" variant="light">EXPENSE</Badge>;
      default:
        return <Badge color="gray">{type.toUpperCase()}</Badge>;
    }
  };

  return (
    <AppShell>
      <main className="content">
        <Group justify="space-between" align="flex-start" mb="lg">
          <div>
            <div className="eyebrow">Financial Management & Ledger</div>
            <h1 className="page-title">Accounting Engine</h1>
            <p className="page-subtitle">
              Double-entry chart of accounts, balanced journal entries, and real-time general ledger tracking.
            </p>
          </div>
          <Group>
            {activeTab === 'accounts' && (
              <Button leftSection={<IconPlus size={18} />} color="teal" onClick={handleOpenAddAccount}>
                Add Account
              </Button>
            )}
            {activeTab === 'entries' && (
              <Button leftSection={<IconScale size={18} />} color="teal" onClick={handleOpenCreateEntry}>
                New Journal Entry
              </Button>
            )}
          </Group>
        </Group>

        {/* Top Summary Cards */}
        <Grid mb="xl">
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Paper p="md" radius="md" style={{ border: '1px solid #e2e8f0', background: '#ffffff' }}>
              <Group justify="space-between" mb="xs">
                <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                  Chart of Accounts
                </Text>
                <IconBuildingBank size={18} color="#0d9488" />
              </Group>
              <Text size="xl" fw={700} c="#0f172a">
                {accounts.length} Accounts
              </Text>
              <Text size="xs" c="dimmed">
                Assets, Liabilities, Equity, P&L
              </Text>
            </Paper>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Paper p="md" radius="md" style={{ border: '1px solid #bae6fd', background: '#f0f9ff' }}>
              <Group justify="space-between" mb="xs">
                <Text size="xs" c="sky.8" fw={600} tt="uppercase">
                  Journal Entries
                </Text>
                <IconFileSpreadsheet size={18} color="#0284c7" />
              </Group>
              <Text size="xl" fw={700} c="sky.9">
                {entries.length} Posted
              </Text>
              <Text size="xs" c="sky.7">
                Balanced double entries
              </Text>
            </Paper>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Paper p="md" radius="md" style={{ border: '1px solid #e2e8f0', background: '#ffffff' }}>
              <Group justify="space-between" mb="xs">
                <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                  Active Asset Accounts
                </Text>
                <IconCreditCard size={18} color="#16a34a" />
              </Group>
              <Text size="xl" fw={700} c="#0f172a">
                {accounts.filter((a) => a.type === 'asset').length}
              </Text>
              <Text size="xs" c="dimmed">
                Cash, Bank, Inventory, Receivables
              </Text>
            </Paper>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Paper p="md" radius="md" style={{ border: '1px solid #fed7aa', background: '#fffbeb' }}>
              <Group justify="space-between" mb="xs">
                <Text size="xs" c="orange.8" fw={600} tt="uppercase">
                  Operating Expenses
                </Text>
                <IconCoins size={18} color="#ea580c" />
              </Group>
              <Text size="xl" fw={700} c="orange.9">
                {accounts.filter((a) => a.type === 'expense').length}
              </Text>
              <Text size="xs" c="orange.7">
                Salaries, Rent, Utilities, COGS
              </Text>
            </Paper>
          </Grid.Col>
        </Grid>

        {/* Tabs */}
        <Tabs value={activeTab} onChange={setActiveTab} color="teal">
          <Tabs.List mb="lg">
            <Tabs.Tab value="accounts" leftSection={<IconBuildingBank size={16} />}>
              Chart of Accounts ({accounts.length})
            </Tabs.Tab>
            <Tabs.Tab value="entries" leftSection={<IconReceipt2 size={16} />}>
              Journal Entries ({entries.length})
            </Tabs.Tab>
            <Tabs.Tab value="ledger" leftSection={<IconListDetails size={16} />}>
              General Ledger Drilldown
            </Tabs.Tab>
          </Tabs.List>

          {/* TAB 1: CHART OF ACCOUNTS */}
          <Tabs.Panel value="accounts">
            <Paper p="md" radius="md" style={{ border: '1px solid #e2e8f0', background: '#ffffff' }}>
              <Group justify="space-between" mb="md">
                <Group gap="sm">
                  <TextInput
                    placeholder="Search account code or name..."
                    leftSection={<IconSearch size={16} />}
                    value={accountSearch}
                    onChange={(e) => setAccountSearch(e.currentTarget.value)}
                    style={{ width: 260 }}
                  />
                  <Select
                    value={typeFilter}
                    onChange={(val) => setTypeFilter(val || 'all')}
                    data={[
                      { value: 'all', label: 'All Classifications' },
                      { value: 'asset', label: 'Assets' },
                      { value: 'liability', label: 'Liabilities' },
                      { value: 'equity', label: 'Equity' },
                      { value: 'revenue', label: 'Revenues' },
                      { value: 'expense', label: 'Expenses' },
                    ]}
                    style={{ width: 180 }}
                  />
                </Group>
                <Button leftSection={<IconPlus size={16} />} color="teal" size="xs" onClick={handleOpenAddAccount}>
                  Add Account
                </Button>
              </Group>

              {isLoadingAccounts ? (
                <Text p="xl" ta="center" c="dimmed">
                  Loading accounts...
                </Text>
              ) : accounts.length === 0 ? (
                <Alert color="teal" variant="light" title="No accounts found">
                  Add accounts to your pharmacy Chart of Accounts to organize your assets, liabilities, income, and expenses.
                </Alert>
              ) : (
                <Table highlightOnHover verticalSpacing="sm">
                  <Table.Thead style={{ background: '#f8fafc' }}>
                    <Table.Tr>
                      <Table.Th style={{ width: 110 }}>Code</Table.Th>
                      <Table.Th>Account Title</Table.Th>
                      <Table.Th>Type</Table.Th>
                      <Table.Th>Scope</Table.Th>
                      <Table.Th>Status</Table.Th>
                      <Table.Th style={{ width: 140 }}>Actions</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {accounts.map((acc) => (
                      <Table.Tr key={acc.id}>
                        <Table.Td>
                          <Badge size="md" variant="outline" color="dark">
                            {acc.code}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" fw={600} c="#0f172a">
                            {acc.name}
                          </Text>
                        </Table.Td>
                        <Table.Td>{getAccountTypeBadge(acc.type)}</Table.Td>
                        <Table.Td>
                          <Badge size="xs" color={acc.is_system ? 'violet' : 'gray'} variant="light">
                            {acc.is_system ? 'System Core' : 'Custom'}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Badge size="xs" color={acc.is_active ? 'teal' : 'gray'} variant="dot">
                            {acc.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Group gap={6}>
                            <Button
                              size="xs"
                              variant="subtle"
                              color="teal"
                              onClick={() => {
                                setSelectedLedgerAccountId(String(acc.id));
                                setActiveTab('ledger');
                              }}
                            >
                              Ledger
                            </Button>
                            <Tooltip label="Edit Account">
                              <ActionIcon
                                size="sm"
                                variant="subtle"
                                color="teal"
                                onClick={() => handleOpenEditAccount(acc)}
                              >
                                <IconEdit size={14} />
                              </ActionIcon>
                            </Tooltip>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              )}
            </Paper>
          </Tabs.Panel>

          {/* TAB 2: JOURNAL ENTRIES */}
          <Tabs.Panel value="entries">
            <Paper p="md" radius="md" style={{ border: '1px solid #e2e8f0', background: '#ffffff' }}>
              <Group justify="space-between" mb="md">
                <Text size="sm" fw={600} c="#0f172a">
                  Posted Double-Entry Transactions
                </Text>
                <Button leftSection={<IconScale size={16} />} color="teal" size="xs" onClick={handleOpenCreateEntry}>
                  New Journal Entry
                </Button>
              </Group>

              {isLoadingEntries ? (
                <Text p="xl" ta="center" c="dimmed">
                  Loading journal entries...
                </Text>
              ) : entries.length === 0 ? (
                <Alert color="teal" variant="light" title="No journal entries posted yet">
                  Post manual entries or let the POS counter and procurement modules generate automated entries.
                </Alert>
              ) : (
                <Table highlightOnHover verticalSpacing="sm">
                  <Table.Thead style={{ background: '#f8fafc' }}>
                    <Table.Tr>
                      <Table.Th>Entry #</Table.Th>
                      <Table.Th>Date</Table.Th>
                      <Table.Th>Description</Table.Th>
                      <Table.Th>Lines</Table.Th>
                      <Table.Th>Total Balanced Value</Table.Th>
                      <Table.Th>Status</Table.Th>
                      <Table.Th>Created By</Table.Th>
                      <Table.Th style={{ width: 80 }}>Action</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {entries.map((entry) => {
                      // Total entry debits
                      const sumDebit = entry.items
                        ?.filter((it) => it.type === 'debit')
                        .reduce((acc, it) => acc + Number(it.amount), 0) || 0;

                      return (
                        <Table.Tr key={entry.id}>
                          <Table.Td>
                            <Text size="sm" fw={700} c="teal.8">
                              {entry.entry_number}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="xs">{new Date(entry.date).toLocaleDateString()}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" fw={500}>
                              {entry.description}
                            </Text>
                            {entry.reference_type && (
                              <Text size="xs" c="dimmed">
                                Ref: {entry.reference_type}
                              </Text>
                            )}
                          </Table.Td>
                          <Table.Td>
                            <Badge size="xs" variant="light" color="blue">
                              {entry.items?.length || 0} Lines
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" fw={700} c="#0f172a">
                              {currency} {sumDebit.toFixed(2)}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Badge size="xs" color="teal">
                              {entry.status.toUpperCase()}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Text size="xs">{entry.creator?.name || 'Administrator'}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Button
                              size="xs"
                              variant="subtle"
                              color="teal"
                              onClick={() => {
                                setSelectedEntry(entry);
                                openDetailModal();
                              }}
                            >
                              View
                            </Button>
                          </Table.Td>
                        </Table.Tr>
                      );
                    })}
                  </Table.Tbody>
                </Table>
              )}
            </Paper>
          </Tabs.Panel>

          {/* TAB 3: GENERAL LEDGER */}
          <Tabs.Panel value="ledger">
            <Paper p="md" radius="md" style={{ border: '1px solid #e2e8f0', background: '#ffffff' }}>
              <Group justify="space-between" mb="lg">
                <Select
                  label="Select Account to View Ledger"
                  placeholder="Choose account..."
                  searchable
                  value={selectedLedgerAccountId}
                  onChange={(val) => setSelectedLedgerAccountId(val || '')}
                  data={accounts.map((a) => ({
                    value: String(a.id),
                    label: `${a.code} - ${a.name} (${a.type.toUpperCase()})`,
                  }))}
                  style={{ width: 360 }}
                />

                {ledger && (
                  <Paper p="sm" radius="md" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <Text size="xs" c="dimmed">
                      Closing Running Balance
                    </Text>
                    <Text size="lg" fw={700} c="teal.8">
                      {currency} {Number(ledger.final_balance).toFixed(2)}
                    </Text>
                  </Paper>
                )}
              </Group>

              {!selectedLedgerAccountId ? (
                <Alert color="teal" variant="light" title="Select an Account">
                  Choose any Chart of Account from the dropdown above to inspect its real-time transaction history and
                  running ledger balance.
                </Alert>
              ) : isLoadingLedger ? (
                <Text p="xl" ta="center" c="dimmed">
                  Loading account ledger...
                </Text>
              ) : ledger?.transactions.length === 0 ? (
                <Alert color="blue" variant="light" title="No transactions for this account">
                  There are no posted journal entries affecting this account yet.
                </Alert>
              ) : (
                <Table highlightOnHover verticalSpacing="sm">
                  <Table.Thead style={{ background: '#f8fafc' }}>
                    <Table.Tr>
                      <Table.Th>Date</Table.Th>
                      <Table.Th>Entry #</Table.Th>
                      <Table.Th>Description</Table.Th>
                      <Table.Th style={{ textAlign: 'right' }}>Debit ({currency})</Table.Th>
                      <Table.Th style={{ textAlign: 'right' }}>Credit ({currency})</Table.Th>
                      <Table.Th style={{ textAlign: 'right' }}>Running Balance ({currency})</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {ledger?.transactions.map((tx) => (
                      <Table.Tr key={tx.id}>
                        <Table.Td>
                          <Text size="xs">{new Date(tx.date).toLocaleDateString()}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" fw={600} c="teal.8">
                            {tx.entry_number}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{tx.description}</Text>
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'right' }}>
                          {tx.debit ? (
                            <Text size="sm" fw={600} c="blue.7">
                              {Number(tx.debit).toFixed(2)}
                            </Text>
                          ) : (
                            '—'
                          )}
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'right' }}>
                          {tx.credit ? (
                            <Text size="sm" fw={600} c="orange.7">
                              {Number(tx.credit).toFixed(2)}
                            </Text>
                          ) : (
                            '—'
                          )}
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'right' }}>
                          <Text size="sm" fw={700} c="#0f172a">
                            {Number(tx.running_balance).toFixed(2)}
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              )}
            </Paper>
          </Tabs.Panel>
        </Tabs>

        {/* MODAL: ADD / EDIT ACCOUNT */}
        <Modal
          opened={accountModalOpened}
          onClose={closeAccountModal}
          title={editingAccount ? 'Edit Account' : 'Add Chart of Account'}
          size="md"
          centered
        >
          <Stack gap="md">
            <TextInput
              label="Account Code"
              placeholder="e.g. 1050 or 6050"
              required
              value={accountForm.code}
              onChange={(e) => setAccountForm((prev) => ({ ...prev, code: e.currentTarget.value }))}
            />

            <TextInput
              label="Account Title"
              placeholder="e.g. Petty Cash, Office Supplies"
              required
              value={accountForm.name}
              onChange={(e) => setAccountForm((prev) => ({ ...prev, name: e.currentTarget.value }))}
            />

            <Select
              label="Account Classification Type"
              required
              value={accountForm.type}
              onChange={(val) => setAccountForm((prev) => ({ ...prev, type: (val as any) || 'expense' }))}
              data={[
                { value: 'asset', label: 'Asset (e.g. Cash, Inventory, Receivable)' },
                { value: 'liability', label: 'Liability (e.g. Payable, Sales Tax)' },
                { value: 'equity', label: "Equity (e.g. Owner's Capital, Retained Earnings)" },
                { value: 'revenue', label: 'Revenue (e.g. Medicine Sales, Service)' },
                { value: 'expense', label: 'Expense (e.g. Rent, Salaries, COGS)' },
              ]}
            />

            <Switch
              label="Active Account"
              checked={accountForm.is_active}
              onChange={(e) => setAccountForm((prev) => ({ ...prev, is_active: e.currentTarget.checked }))}
            />

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeAccountModal}>
                Cancel
              </Button>
              <Button
                color="teal"
                onClick={handleSaveAccount}
                loading={createAccountMutation.isPending || updateAccountMutation.isPending}
              >
                {editingAccount ? 'Save Changes' : 'Create Account'}
              </Button>
            </Group>
          </Stack>
        </Modal>

        {/* MODAL: NEW JOURNAL ENTRY */}
        <Modal
          opened={entryModalOpened}
          onClose={closeEntryModal}
          title="Post Balanced Journal Entry"
          size="xl"
          centered
        >
          <Stack gap="md">
            <Grid>
              <Grid.Col span={4}>
                <TextInput
                  label="Transaction Date"
                  type="date"
                  required
                  value={entryForm.date}
                  onChange={(e) => setEntryForm((prev) => ({ ...prev, date: e.currentTarget.value }))}
                />
              </Grid.Col>
              <Grid.Col span={8}>
                <TextInput
                  label="Description / Memo"
                  placeholder="e.g. Daily Cash Sales Deposit or Electricity Bill Payment"
                  required
                  value={entryForm.description}
                  onChange={(e) => setEntryForm((prev) => ({ ...prev, description: e.currentTarget.value }))}
                />
              </Grid.Col>
            </Grid>

            <Text size="sm" fw={600} c="#0f172a" mt="xs">
              Double-Entry Lines (Debits & Credits)
            </Text>

            {entryForm.items.map((line, idx) => (
              <Paper key={idx} p="sm" radius="md" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <Grid align="flex-end">
                  <Grid.Col span={{ base: 12, sm: 4 }}>
                    <Select
                      label="Account"
                      placeholder="Choose account"
                      searchable
                      required
                      value={line.chart_of_account_id}
                      onChange={(val) => handleUpdateEntryLine(idx, 'chart_of_account_id', val || '')}
                      data={accounts.map((a) => ({
                        value: String(a.id),
                        label: `${a.code} - ${a.name}`,
                      }))}
                    />
                  </Grid.Col>

                  <Grid.Col span={{ base: 6, sm: 3 }}>
                    <SegmentedControl
                      fullWidth
                      color={line.type === 'debit' ? 'blue' : 'orange'}
                      value={line.type}
                      onChange={(val) => handleUpdateEntryLine(idx, 'type', val)}
                      data={[
                        { label: 'Debit (+)', value: 'debit' },
                        { label: 'Credit (-)', value: 'credit' },
                      ]}
                    />
                  </Grid.Col>

                  <Grid.Col span={{ base: 6, sm: 2.5 }}>
                    <NumberInput
                      label={`Amount (${currency})`}
                      min={0.01}
                      decimalScale={2}
                      value={line.amount}
                      onChange={(val) => handleUpdateEntryLine(idx, 'amount', Number(val) || 0)}
                    />
                  </Grid.Col>

                  <Grid.Col span={{ base: 10, sm: 2 }}>
                    <TextInput
                      label="Memo"
                      placeholder="Line note"
                      value={line.description}
                      onChange={(e) => handleUpdateEntryLine(idx, 'description', e.currentTarget.value)}
                    />
                  </Grid.Col>

                  <Grid.Col span={{ base: 2, sm: 0.5 }}>
                    <ActionIcon
                      color="red"
                      variant="subtle"
                      disabled={entryForm.items.length <= 2}
                      onClick={() => handleRemoveEntryLine(idx)}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Grid.Col>
                </Grid>
              </Paper>
            ))}

            <Button variant="light" color="teal" size="xs" leftSection={<IconPlus size={14} />} onClick={handleAddEntryLine}>
              Add Another Line
            </Button>

            {/* REAL-TIME BALANCE VALIDATOR */}
            <Paper
              p="sm"
              radius="md"
              style={{
                background: isBalanced ? '#f0fdf4' : '#fef2f2',
                border: isBalanced ? '1px solid #bbf7d0' : '1px solid #fecaca',
              }}
            >
              <Group justify="space-between">
                <div>
                  <Text size="xs" c="dimmed">
                    Total Debits
                  </Text>
                  <Text size="sm" fw={700} c="blue.8">
                    {currency} {totalDebits.toFixed(2)}
                  </Text>
                </div>

                <div>
                  <Text size="xs" c="dimmed">
                    Total Credits
                  </Text>
                  <Text size="sm" fw={700} c="orange.8">
                    {currency} {totalCredits.toFixed(2)}
                  </Text>
                </div>

                <div>
                  <Text size="xs" c="dimmed">
                    Difference
                  </Text>
                  <Badge size="md" color={isBalanced ? 'green' : 'red'}>
                    {isBalanced ? 'BALANCED ($0.00)' : `UNBALANCED (${currency} ${diffBalance.toFixed(2)})`}
                  </Badge>
                </div>
              </Group>
            </Paper>

            {!isBalanced && (
              <Alert color="red" variant="light" icon={<IconAlertCircle size={16} />}>
                Total debits and total credits must balance to exactly {currency} 0.00 difference before you can post
                this entry to the General Ledger.
              </Alert>
            )}

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeEntryModal}>
                Cancel
              </Button>
              <Button
                color="teal"
                disabled={!isBalanced}
                onClick={handleSubmitEntry}
                loading={createEntryMutation.isPending}
              >
                Post Journal Entry
              </Button>
            </Group>
          </Stack>
        </Modal>

        {/* MODAL: VIEW ENTRY DETAILS */}
        <Modal
          opened={detailModalOpened}
          onClose={closeDetailModal}
          title={`Journal Entry ${selectedEntry?.entry_number}`}
          size="lg"
          centered
        >
          {selectedEntry && (
            <Stack gap="md">
              <Group justify="space-between">
                <div>
                  <Text size="xs" c="dimmed">
                    Description
                  </Text>
                  <Text size="sm" fw={600}>
                    {selectedEntry.description}
                  </Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">
                    Date
                  </Text>
                  <Text size="sm">{new Date(selectedEntry.date).toLocaleDateString()}</Text>
                </div>
              </Group>

              <Table highlightOnHover>
                <Table.Thead style={{ background: '#f8fafc' }}>
                  <Table.Tr>
                    <Table.Th>Account</Table.Th>
                    <Table.Th>Type</Table.Th>
                    <Table.Th style={{ textAlign: 'right' }}>Debit</Table.Th>
                    <Table.Th style={{ textAlign: 'right' }}>Credit</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {selectedEntry.items?.map((it, idx) => (
                    <Table.Tr key={idx}>
                      <Table.Td>
                        <Text size="sm" fw={600}>
                          {it.account?.code} - {it.account?.name}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge size="xs" color={it.type === 'debit' ? 'blue' : 'orange'}>
                          {it.type.toUpperCase()}
                        </Badge>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        {it.type === 'debit' ? `${currency} ${Number(it.amount).toFixed(2)}` : '—'}
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        {it.type === 'credit' ? `${currency} ${Number(it.amount).toFixed(2)}` : '—'}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>

              <Group justify="flex-end" mt="md">
                <Button variant="default" onClick={closeDetailModal}>
                  Close
                </Button>
              </Group>
            </Stack>
          )}
        </Modal>
      </main>
    </AppShell>
  );
}
