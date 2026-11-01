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
  IconActivityHeartbeat,
  IconAdjustments,
  IconAlertTriangle,
  IconCalendarTime,
  IconCheck,
  IconClock,
  IconDatabase,
  IconEdit,
  IconHistory,
  IconPackage,
  IconPlus,
  IconSearch,
  IconTrash,
} from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppShell } from '@/components/app-shell';
import { getMedicines } from '@/features/catalog/api';
import {
  Batch,
  StockAdjustment,
  createBatch,
  createStockAdjustment,
  getBatches,
  getStockAdjustments,
  getStockMovements,
  updateBatch,
} from '@/features/inventory/api';
import { useAuthStore } from '@/stores/auth-store';

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const { tenantId, tenants } = useAuthStore();
  const currentTenant = tenants.find((t) => t.id === tenantId);
  const currency = currentTenant?.currency_code || 'PKR';

  const [activeTab, setActiveTab] = useState<string | null>('batches');
  const [batchSearch, setBatchSearch] = useState('');
  const [debouncedBatchSearch] = useDebouncedValue(batchSearch, 300);
  const [batchFilter, setBatchFilter] = useState<string>('all');
  const [movementType, setMovementType] = useState<string>('all');

  // Modals
  const [batchModalOpened, { open: openBatchModal, close: closeBatchModal }] = useDisclosure(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);

  const [adjustmentModalOpened, { open: openAdjustmentModal, close: closeAdjustmentModal }] = useDisclosure(false);
  const [selectedAdjustment, setSelectedAdjustment] = useState<StockAdjustment | null>(null);
  const [detailModalOpened, { open: openDetailModal, close: closeDetailModal }] = useDisclosure(false);

  // Queries
  const { data: batchesData, isLoading: isLoadingBatches } = useQuery({
    queryKey: ['batches', debouncedBatchSearch],
    queryFn: () => getBatches(debouncedBatchSearch),
  });

  const { data: movementsData, isLoading: isLoadingMovements } = useQuery({
    queryKey: ['stock-movements', movementType],
    queryFn: () => getStockMovements(undefined, movementType),
  });

  const { data: adjustmentsData, isLoading: isLoadingAdjustments } = useQuery({
    queryKey: ['stock-adjustments'],
    queryFn: () => getStockAdjustments(),
  });

  const { data: medicinesData } = useQuery({
    queryKey: ['medicines-lookup'],
    queryFn: () => getMedicines(),
  });

  const medicines = medicinesData?.data || [];
  const batches = batchesData?.data || [];
  const movements = movementsData?.data || [];
  const adjustments = adjustmentsData?.data || [];

  const filteredBatches = batches.filter((b) => {
    if (batchFilter === 'in_stock') return Number(b.quantity) > 0;
    if (batchFilter === 'expired') return new Date(b.expiry_date).getTime() <= Date.now();
    if (batchFilter === 'expiring_soon') {
      const diff = Math.ceil((new Date(b.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return diff > 0 && diff <= 90;
    }
    return true;
  });

  // Batch Form State
  const [batchForm, setBatchForm] = useState({
    medicine_id: '',
    batch_number: '',
    expiry_date: '',
    mfg_date: '',
    cost_price: 0,
    selling_price: 0,
    quantity: 0,
    is_active: true,
  });

  // Stock Adjustment Form State
  const [adjReason, setAdjReason] = useState('Physical Audit');
  const [adjItems, setAdjItems] = useState<
    Array<{
      medicine_id: string;
      batch_id: string;
      system_quantity: number;
      counted_quantity: number;
      unit_cost: number;
    }>
  >([
    {
      medicine_id: '',
      batch_id: '',
      system_quantity: 0,
      counted_quantity: 0,
      unit_cost: 0,
    },
  ]);

  // Mutations
  const createBatchMutation = useMutation({
    mutationFn: (data: any) => createBatch(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      notifications.show({
        title: 'Batch Registered',
        message: 'New inventory batch created with opening stock audit movement.',
        color: 'teal',
        icon: <IconCheck size={18} />,
      });
      closeBatchModal();
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Failed to Save Batch',
        message: err?.message || 'Check batch inputs and try again.',
        color: 'red',
      });
    },
  });

  const updateBatchMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateBatch(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      notifications.show({
        title: 'Batch Updated',
        message: 'Batch information updated successfully.',
        color: 'teal',
        icon: <IconCheck size={18} />,
      });
      closeBatchModal();
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Update Failed',
        message: err?.message || 'Could not update batch.',
        color: 'red',
      });
    },
  });

  const createAdjustmentMutation = useMutation({
    mutationFn: (data: any) => createStockAdjustment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-adjustments'] });
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      notifications.show({
        title: 'Adjustment Completed',
        message: 'Inventory quantities updated and adjustment movements recorded.',
        color: 'teal',
        icon: <IconCheck size={18} />,
      });
      closeAdjustmentModal();
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Adjustment Failed',
        message: err?.message || 'Could not record stock adjustment.',
        color: 'red',
      });
    },
  });

  const handleOpenAddBatch = () => {
    setEditingBatch(null);
    setBatchForm({
      medicine_id: medicines[0]?.id ? String(medicines[0].id) : '',
      batch_number: `BATCH-${Date.now().toString().slice(-6)}`,
      expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      mfg_date: new Date().toISOString().split('T')[0],
      cost_price: 50,
      selling_price: 75,
      quantity: 100,
      is_active: true,
    });
    openBatchModal();
  };

  const handleOpenEditBatch = (batch: Batch) => {
    setEditingBatch(batch);
    setBatchForm({
      medicine_id: String(batch.medicine_id),
      batch_number: batch.batch_number,
      expiry_date: batch.expiry_date ? batch.expiry_date.split('T')[0] : '',
      mfg_date: batch.mfg_date ? batch.mfg_date.split('T')[0] : '',
      cost_price: Number(batch.cost_price),
      selling_price: Number(batch.selling_price),
      quantity: Number(batch.quantity),
      is_active: batch.is_active,
    });
    openBatchModal();
  };

  const handleSaveBatch = () => {
    if (!batchForm.batch_number || !batchForm.expiry_date) {
      notifications.show({
        title: 'Validation Error',
        message: 'Batch number and expiry date are required.',
        color: 'red',
      });
      return;
    }

    if (editingBatch) {
      updateBatchMutation.mutate({
        id: editingBatch.id,
        data: {
          batch_number: batchForm.batch_number,
          expiry_date: batchForm.expiry_date,
          mfg_date: batchForm.mfg_date || null,
          cost_price: batchForm.cost_price,
          selling_price: batchForm.selling_price,
          quantity: batchForm.quantity,
          is_active: batchForm.is_active,
        },
      });
    } else {
      createBatchMutation.mutate({
        medicine_id: Number(batchForm.medicine_id),
        batch_number: batchForm.batch_number,
        expiry_date: batchForm.expiry_date,
        mfg_date: batchForm.mfg_date || null,
        cost_price: batchForm.cost_price,
        selling_price: batchForm.selling_price,
        quantity: batchForm.quantity,
        is_active: batchForm.is_active,
      });
    }
  };

  // Stock Adjustment Handlers
  const handleOpenAdjustment = () => {
    setAdjReason('Physical Audit');
    setAdjItems([
      {
        medicine_id: medicines[0]?.id ? String(medicines[0].id) : '',
        batch_id: '',
        system_quantity: 0,
        counted_quantity: 0,
        unit_cost: 0,
      },
    ]);
    openAdjustmentModal();
  };

  const handleAddAdjItem = () => {
    setAdjItems((prev) => [
      ...prev,
      {
        medicine_id: medicines[0]?.id ? String(medicines[0].id) : '',
        batch_id: '',
        system_quantity: 0,
        counted_quantity: 0,
        unit_cost: 0,
      },
    ]);
  };

  const handleRemoveAdjItem = (index: number) => {
    setAdjItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateAdjItem = (index: number, field: string, val: any) => {
    setAdjItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };

      // If medicine changed or batch changed, auto-populate system quantity & unit cost
      if (field === 'batch_id' && val) {
        const foundBatch = batches.find((b) => String(b.id) === String(val));
        if (foundBatch) {
          copy[index].system_quantity = Number(foundBatch.quantity);
          copy[index].unit_cost = Number(foundBatch.cost_price);
        }
      }
      return copy;
    });
  };

  const handleSubmitAdjustment = () => {
    const invalid = adjItems.some((item) => !item.medicine_id);
    if (invalid) {
      notifications.show({
        title: 'Validation Error',
        message: 'Please ensure every line item has a medicine selected.',
        color: 'red',
      });
      return;
    }

    createAdjustmentMutation.mutate({
      reason: adjReason,
      items: adjItems.map((item) => ({
        medicine_id: Number(item.medicine_id),
        batch_id: item.batch_id ? Number(item.batch_id) : null,
        system_quantity: Number(item.system_quantity),
        counted_quantity: Number(item.counted_quantity),
        unit_cost: Number(item.unit_cost),
      })),
    });
  };

  // FEFO helper
  const getExpiryStatus = (dateStr: string) => {
    const exp = new Date(dateStr).getTime();
    const now = Date.now();
    const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return { label: 'Expired', color: 'red', isUrgent: true };
    }
    if (diffDays <= 90) {
      return { label: `Expiring in ${diffDays}d`, color: 'orange', isUrgent: true };
    }
    return { label: `${diffDays} days left`, color: 'teal', isUrgent: false };
  };

  // KPI Calculations
  const totalBatches = batches.length;
  const expiredCount = batches.filter((b) => new Date(b.expiry_date).getTime() <= Date.now()).length;
  const expiringSoonCount = batches.filter((b) => {
    const diff = Math.ceil((new Date(b.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff > 0 && diff <= 90;
  }).length;
  const totalStockUnits = batches.reduce((acc, b) => acc + Number(b.quantity), 0);

  return (
    <AppShell>
      <main className="content">
        <Group justify="space-between" align="flex-start" mb="lg">
          <div>
            <div className="eyebrow">Enterprise Supply & Stock</div>
            <h1 className="page-title">Inventory Engine</h1>
            <p className="page-subtitle">
              First-Expired First-Out (FEFO) batch tracking, audit-trailed movements, and stock reconciliations.
            </p>
          </div>
          <Group>
            {activeTab === 'batches' && (
              <Button leftSection={<IconPlus size={18} />} color="teal" onClick={handleOpenAddBatch}>
                Register Batch
              </Button>
            )}
            {activeTab === 'adjustments' && (
              <Button leftSection={<IconAdjustments size={18} />} color="teal" onClick={handleOpenAdjustment}>
                New Stock Adjustment
              </Button>
            )}
          </Group>
        </Group>

        {/* Top KPI Cards */}
        <Grid mb="xl">
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Paper p="md" radius="md" style={{ border: '1px solid #e2e8f0', background: '#ffffff' }}>
              <Group justify="space-between" mb="xs">
                <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                  Active Batches
                </Text>
                <IconDatabase size={18} color="#0d9488" />
              </Group>
              <Text size="xl" fw={700} c="#0f172a">
                {totalBatches}
              </Text>
              <Text size="xs" c="dimmed">
                Registered in FEFO order
              </Text>
            </Paper>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Paper p="md" radius="md" style={{ border: '1px solid #e2e8f0', background: '#ffffff' }}>
              <Group justify="space-between" mb="xs">
                <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                  Total Units on Hand
                </Text>
                <IconPackage size={18} color="#0284c7" />
              </Group>
              <Text size="xl" fw={700} c="#0f172a">
                {totalStockUnits.toLocaleString()}
              </Text>
              <Text size="xs" c="dimmed">
                Across all active batches
              </Text>
            </Paper>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Paper p="md" radius="md" style={{ border: '1px solid #fed7aa', background: '#fffbeb' }}>
              <Group justify="space-between" mb="xs">
                <Text size="xs" c="orange.8" fw={600} tt="uppercase">
                  Expiring Soon (90d)
                </Text>
                <IconClock size={18} color="#ea580c" />
              </Group>
              <Text size="xl" fw={700} c="orange.9">
                {expiringSoonCount}
              </Text>
              <Text size="xs" c="orange.7">
                Prioritize for OTC dispensing
              </Text>
            </Paper>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Paper p="md" radius="md" style={{ border: '1px solid #fecaca', background: '#fef2f2' }}>
              <Group justify="space-between" mb="xs">
                <Text size="xs" c="red.8" fw={600} tt="uppercase">
                  Expired Batches
                </Text>
                <IconAlertTriangle size={18} color="#dc2626" />
              </Group>
              <Text size="xl" fw={700} c="red.9">
                {expiredCount}
              </Text>
              <Text size="xs" c="red.7">
                Requires quarantine or adjustment
              </Text>
            </Paper>
          </Grid.Col>
        </Grid>

        {/* Main Tabs */}
        <Tabs value={activeTab} onChange={setActiveTab} color="teal">
          <Tabs.List mb="lg">
            <Tabs.Tab value="batches" leftSection={<IconCalendarTime size={16} />}>
              FEFO Batches ({batches.length})
            </Tabs.Tab>
            <Tabs.Tab value="movements" leftSection={<IconHistory size={16} />}>
              Stock Movements Log ({movements.length})
            </Tabs.Tab>
            <Tabs.Tab value="adjustments" leftSection={<IconAdjustments size={16} />}>
              Stock Adjustments ({adjustments.length})
            </Tabs.Tab>
          </Tabs.List>

          {/* TAB 1: FEFO BATCHES */}
          <Tabs.Panel value="batches">
            <Paper p="md" radius="md" style={{ border: '1px solid #e2e8f0', background: '#ffffff' }}>
              <Group justify="space-between" mb="md">
                <Group gap="sm">
                  <TextInput
                    placeholder="Search batch number or medicine..."
                    leftSection={<IconSearch size={16} />}
                    value={batchSearch}
                    onChange={(e) => setBatchSearch(e.currentTarget.value)}
                    style={{ width: 280 }}
                  />
                  <Select
                    value={batchFilter}
                    onChange={(val) => setBatchFilter(val || 'all')}
                    data={[
                      { value: 'all', label: 'All Batches' },
                      { value: 'in_stock', label: 'In Stock (>0)' },
                      { value: 'expiring_soon', label: 'Expiring Soon (90d)' },
                      { value: 'expired', label: 'Expired Batches' },
                    ]}
                    style={{ width: 190 }}
                  />
                </Group>
                <Text size="xs" c="dimmed">
                  Sorted by earliest expiry date (FEFO rule)
                </Text>
              </Group>

              {isLoadingBatches ? (
                <Text p="xl" ta="center" c="dimmed">
                  Loading inventory batches...
                </Text>
              ) : filteredBatches.length === 0 ? (
                <Alert color="teal" variant="light" title="No batches found">
                  No batches match your search or filter criteria. Register a batch or adjust filters.
                </Alert>
              ) : (
                <Table highlightOnHover verticalSpacing="sm">
                  <Table.Thead style={{ background: '#f8fafc' }}>
                    <Table.Tr>
                      <Table.Th>Batch #</Table.Th>
                      <Table.Th>Medicine</Table.Th>
                      <Table.Th>Expiry Date</Table.Th>
                      <Table.Th>Mfg Date</Table.Th>
                      <Table.Th>Unit Cost</Table.Th>
                      <Table.Th>Retail Price</Table.Th>
                      <Table.Th>In Stock</Table.Th>
                      <Table.Th>Status</Table.Th>
                      <Table.Th style={{ width: 70 }}>Action</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {filteredBatches.map((batch) => {
                      const expInfo = getExpiryStatus(batch.expiry_date);
                      return (
                        <Table.Tr key={batch.id}>
                          <Table.Td>
                            <Text size="sm" fw={600} c="#0f172a">
                              {batch.batch_number}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" fw={600} c="#0f172a">
                              {batch.medicine?.name || `Medicine #${batch.medicine_id}`}
                            </Text>
                            <Text size="xs" c="dimmed">
                              SKU: {batch.medicine?.sku || 'N/A'}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Group gap={6}>
                              <Text size="sm" fw={500}>
                                {new Date(batch.expiry_date).toLocaleDateString()}
                              </Text>
                              <Badge size="xs" color={expInfo.color} variant="light">
                                {expInfo.label}
                              </Badge>
                            </Group>
                          </Table.Td>
                          <Table.Td>
                            <Text size="xs" c="dimmed">
                              {batch.mfg_date ? new Date(batch.mfg_date).toLocaleDateString() : '—'}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">
                              {currency} {Number(batch.cost_price).toFixed(2)}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" fw={600} c="teal.8">
                              {currency} {Number(batch.selling_price).toFixed(2)}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Badge
                              size="md"
                              color={Number(batch.quantity) > 10 ? 'teal' : Number(batch.quantity) > 0 ? 'yellow' : 'red'}
                              variant="filled"
                            >
                              {Number(batch.quantity).toLocaleString()}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Badge size="sm" color={batch.is_active ? 'teal' : 'gray'} variant="light">
                              {batch.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Tooltip label="Edit Batch">
                              <ActionIcon variant="subtle" color="teal" onClick={() => handleOpenEditBatch(batch)}>
                                <IconEdit size={16} />
                              </ActionIcon>
                            </Tooltip>
                          </Table.Td>
                        </Table.Tr>
                      );
                    })}
                  </Table.Tbody>
                </Table>
              )}
            </Paper>
          </Tabs.Panel>

          {/* TAB 2: STOCK MOVEMENTS LOG */}
          <Tabs.Panel value="movements">
            <Paper p="md" radius="md" style={{ border: '1px solid #e2e8f0', background: '#ffffff' }}>
              <Group justify="space-between" mb="md">
                <Select
                  label="Filter by Movement Type"
                  value={movementType}
                  onChange={(val) => setMovementType(val || 'all')}
                  data={[
                    { value: 'all', label: 'All Movement Types' },
                    { value: 'opening_stock', label: 'Opening Stock' },
                    { value: 'purchase', label: 'Purchase Receipt (GRN)' },
                    { value: 'sale', label: 'POS Sale' },
                    { value: 'adjustment_in', label: 'Adjustment In (+)' },
                    { value: 'adjustment_out', label: 'Adjustment Out (-)' },
                  ]}
                  style={{ width: 260 }}
                />
                <Text size="xs" c="dimmed">
                  Immutable audit trail of all inventory events
                </Text>
              </Group>

              {isLoadingMovements ? (
                <Text p="xl" ta="center" c="dimmed">
                  Loading movements log...
                </Text>
              ) : movements.length === 0 ? (
                <Alert color="blue" variant="light" title="No stock movements recorded">
                  Movements will appear here automatically when sales, purchases, or adjustments occur.
                </Alert>
              ) : (
                <Table highlightOnHover verticalSpacing="sm">
                  <Table.Thead style={{ background: '#f8fafc' }}>
                    <Table.Tr>
                      <Table.Th>Timestamp</Table.Th>
                      <Table.Th>Medicine</Table.Th>
                      <Table.Th>Batch #</Table.Th>
                      <Table.Th>Type</Table.Th>
                      <Table.Th>Change</Table.Th>
                      <Table.Th>Balance After</Table.Th>
                      <Table.Th>Reference / Operator</Table.Th>
                      <Table.Th>Notes</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {movements.map((m) => {
                      const isPositive =
                        m.type === 'purchase' || m.type === 'adjustment_in' || m.type === 'opening_stock';
                      const badgeColor =
                        m.type === 'sale'
                          ? 'blue'
                          : m.type === 'purchase'
                          ? 'teal'
                          : m.type === 'opening_stock'
                          ? 'violet'
                          : m.type === 'adjustment_in'
                          ? 'green'
                          : 'red';

                      return (
                        <Table.Tr key={m.id}>
                          <Table.Td>
                            <Text size="xs" c="dimmed">
                              {new Date(m.created_at).toLocaleString()}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" fw={600} c="#0f172a">
                              {m.medicine?.name || `Medicine #${m.medicine_id}`}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Badge size="xs" variant="outline" color="gray">
                              {m.batch?.batch_number || (m.batch_id ? `#${m.batch_id}` : 'General')}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Badge size="sm" color={badgeColor} variant="light">
                              {m.type.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" fw={700} c={isPositive ? 'teal.7' : 'red.7'}>
                              {isPositive ? `+${m.quantity}` : `-${m.quantity}`}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" fw={600}>
                              {m.balance_after}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="xs" fw={500}>
                              {m.reference_type ? `${m.reference_type} #${m.reference_id || ''}` : 'Direct'}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {m.creator?.name || 'System'}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="xs" c="dimmed">
                              {m.notes || '—'}
                            </Text>
                          </Table.Td>
                        </Table.Tr>
                      );
                    })}
                  </Table.Tbody>
                </Table>
              )}
            </Paper>
          </Tabs.Panel>

          {/* TAB 3: STOCK ADJUSTMENTS */}
          <Tabs.Panel value="adjustments">
            <Paper p="md" radius="md" style={{ border: '1px solid #e2e8f0', background: '#ffffff' }}>
              <Group justify="space-between" mb="md">
                <Text size="sm" fw={600} c="#0f172a">
                  Past Stock Reconciliations & Audits
                </Text>
                <Button leftSection={<IconAdjustments size={16} />} color="teal" size="xs" onClick={handleOpenAdjustment}>
                  New Stock Adjustment
                </Button>
              </Group>

              {isLoadingAdjustments ? (
                <Text p="xl" ta="center" c="dimmed">
                  Loading adjustments...
                </Text>
              ) : adjustments.length === 0 ? (
                <Alert color="teal" variant="light" title="No adjustments found">
                  Stock adjustments allow you to reconcile physical inventory counts with system stock, or write off
                  damaged/expired units.
                </Alert>
              ) : (
                <Table highlightOnHover verticalSpacing="sm">
                  <Table.Thead style={{ background: '#f8fafc' }}>
                    <Table.Tr>
                      <Table.Th>Ref Number</Table.Th>
                      <Table.Th>Date & Time</Table.Th>
                      <Table.Th>Reason</Table.Th>
                      <Table.Th>Items Count</Table.Th>
                      <Table.Th>Operator</Table.Th>
                      <Table.Th>Status</Table.Th>
                      <Table.Th style={{ width: 100 }}>Actions</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {adjustments.map((adj) => (
                      <Table.Tr key={adj.id}>
                        <Table.Td>
                          <Text size="sm" fw={700} c="teal.8">
                            {adj.reference_number}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs" c="dimmed">
                            {new Date(adj.adjusted_at || adj.created_at).toLocaleString()}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" fw={500}>
                            {adj.reason}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge size="sm" variant="light" color="blue">
                            {adj.items?.length || 0} Items
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs">{adj.creator?.name || 'Administrator'}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge size="xs" color="teal">
                            {adj.status.toUpperCase()}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Button
                            variant="subtle"
                            color="teal"
                            size="xs"
                            onClick={() => {
                              setSelectedAdjustment(adj);
                              openDetailModal();
                            }}
                          >
                            View Items
                          </Button>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              )}
            </Paper>
          </Tabs.Panel>
        </Tabs>

        {/* MODAL: REGISTER / EDIT BATCH */}
        <Modal
          opened={batchModalOpened}
          onClose={closeBatchModal}
          title={editingBatch ? 'Edit Inventory Batch' : 'Register New Batch'}
          size="lg"
          centered
        >
          <Stack gap="md">
            {!editingBatch && (
              <Select
                label="Medicine"
                placeholder="Choose medicine"
                required
                searchable
                value={batchForm.medicine_id}
                onChange={(val) => setBatchForm((prev) => ({ ...prev, medicine_id: val || '' }))}
                data={medicines.map((m) => ({
                  value: String(m.id),
                  label: `${m.name} (${m.sku})`,
                }))}
              />
            )}

            <Grid>
              <Grid.Col span={6}>
                <TextInput
                  label="Batch Number"
                  placeholder="e.g. BATCH-2026-A1"
                  required
                  value={batchForm.batch_number}
                  onChange={(e) => setBatchForm((prev) => ({ ...prev, batch_number: e.currentTarget.value }))}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <TextInput
                  label="Expiry Date"
                  type="date"
                  required
                  value={batchForm.expiry_date}
                  onChange={(e) => setBatchForm((prev) => ({ ...prev, expiry_date: e.currentTarget.value }))}
                />
              </Grid.Col>
            </Grid>

            <Grid>
              <Grid.Col span={6}>
                <TextInput
                  label="Manufacturing Date (Optional)"
                  type="date"
                  value={batchForm.mfg_date}
                  onChange={(e) => setBatchForm((prev) => ({ ...prev, mfg_date: e.currentTarget.value }))}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <NumberInput
                  label="Quantity in Stock"
                  required
                  min={0}
                  value={batchForm.quantity}
                  onChange={(val) => setBatchForm((prev) => ({ ...prev, quantity: Number(val) || 0 }))}
                />
              </Grid.Col>
            </Grid>

            <Grid>
              <Grid.Col span={6}>
                <NumberInput
                  label={`Unit Cost Price (${currency})`}
                  required
                  min={0}
                  decimalScale={2}
                  value={batchForm.cost_price}
                  onChange={(val) => setBatchForm((prev) => ({ ...prev, cost_price: Number(val) || 0 }))}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <NumberInput
                  label={`Retail Selling Price (${currency})`}
                  required
                  min={0}
                  decimalScale={2}
                  value={batchForm.selling_price}
                  onChange={(val) => setBatchForm((prev) => ({ ...prev, selling_price: Number(val) || 0 }))}
                />
              </Grid.Col>
            </Grid>

            <Switch
              label="Active Batch (available for POS dispensing & FEFO allocation)"
              checked={batchForm.is_active}
              onChange={(e) => setBatchForm((prev) => ({ ...prev, is_active: e.currentTarget.checked }))}
            />

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeBatchModal}>
                Cancel
              </Button>
              <Button
                color="teal"
                onClick={handleSaveBatch}
                loading={createBatchMutation.isPending || updateBatchMutation.isPending}
              >
                {editingBatch ? 'Save Changes' : 'Register Batch'}
              </Button>
            </Group>
          </Stack>
        </Modal>

        {/* MODAL: NEW STOCK ADJUSTMENT */}
        <Modal
          opened={adjustmentModalOpened}
          onClose={closeAdjustmentModal}
          title="Create Stock Adjustment / Reconciliation"
          size="xl"
          centered
        >
          <Stack gap="md">
            <Select
              label="Reason for Adjustment"
              required
              value={adjReason}
              onChange={(val) => setAdjReason(val || 'Physical Audit')}
              data={[
                { value: 'Physical Audit', label: 'Physical Audit / Periodic Stocktake' },
                { value: 'Damaged Stock Write-off', label: 'Damaged / Broken Stock Write-off' },
                { value: 'Expired Medicine Quarantine', label: 'Expired Medicine Quarantine / Disposal' },
                { value: 'Stock Discrepancy Correction', label: 'Stock Discrepancy Correction' },
                { value: 'Theft or Loss', label: 'Unaccounted Loss or Theft' },
              ]}
            />

            <Text size="sm" fw={600} c="#0f172a" mt="xs">
              Adjustment Line Items
            </Text>

            {adjItems.map((item, index) => {
              const diff = item.counted_quantity - item.system_quantity;
              const medicineBatches = batches.filter((b) => String(b.medicine_id) === String(item.medicine_id));

              return (
                <Paper key={index} p="sm" radius="md" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <Grid align="flex-end">
                    <Grid.Col span={{ base: 12, sm: 4 }}>
                      <Select
                        label="Medicine"
                        placeholder="Choose medicine"
                        searchable
                        required
                        value={item.medicine_id}
                        onChange={(val) => handleUpdateAdjItem(index, 'medicine_id', val || '')}
                        data={medicines.map((m) => ({
                          value: String(m.id),
                          label: `${m.name} (${m.sku})`,
                        }))}
                      />
                    </Grid.Col>

                    <Grid.Col span={{ base: 12, sm: 3 }}>
                      <Select
                        label="Batch (Optional)"
                        placeholder="Select batch"
                        clearable
                        value={item.batch_id}
                        onChange={(val) => handleUpdateAdjItem(index, 'batch_id', val || '')}
                        data={medicineBatches.map((b) => ({
                          value: String(b.id),
                          label: `${b.batch_number} (Exp: ${b.expiry_date})`,
                        }))}
                      />
                    </Grid.Col>

                    <Grid.Col span={{ base: 6, sm: 2 }}>
                      <NumberInput
                        label="System Stock"
                        value={item.system_quantity}
                        onChange={(val) => handleUpdateAdjItem(index, 'system_quantity', Number(val) || 0)}
                      />
                    </Grid.Col>

                    <Grid.Col span={{ base: 6, sm: 2 }}>
                      <NumberInput
                        label="Counted Stock"
                        value={item.counted_quantity}
                        onChange={(val) => handleUpdateAdjItem(index, 'counted_quantity', Number(val) || 0)}
                      />
                    </Grid.Col>

                    <Grid.Col span={{ base: 12, sm: 1 }}>
                      <Group justify="flex-end">
                        <ActionIcon
                          color="red"
                          variant="subtle"
                          disabled={adjItems.length === 1}
                          onClick={() => handleRemoveAdjItem(index)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Grid.Col>
                  </Grid>

                  <Group justify="space-between" mt="xs">
                    <Text size="xs" c="dimmed">
                      Unit Cost: {currency} {item.unit_cost || 0}
                    </Text>
                    <Badge size="sm" color={diff > 0 ? 'green' : diff < 0 ? 'red' : 'gray'}>
                      Difference: {diff > 0 ? `+${diff}` : diff} units
                    </Badge>
                  </Group>
                </Paper>
              );
            })}

            <Button variant="light" color="teal" size="xs" leftSection={<IconPlus size={14} />} onClick={handleAddAdjItem}>
              Add Another Line Item
            </Button>

            <Group justify="flex-end" mt="lg">
              <Button variant="default" onClick={closeAdjustmentModal}>
                Cancel
              </Button>
              <Button color="teal" onClick={handleSubmitAdjustment} loading={createAdjustmentMutation.isPending}>
                Complete Adjustment
              </Button>
            </Group>
          </Stack>
        </Modal>

        {/* MODAL: VIEW ADJUSTMENT DETAILS */}
        <Modal
          opened={detailModalOpened}
          onClose={closeDetailModal}
          title={`Adjustment ${selectedAdjustment?.reference_number}`}
          size="lg"
          centered
        >
          {selectedAdjustment && (
            <Stack gap="md">
              <Group justify="space-between">
                <div>
                  <Text size="xs" c="dimmed">
                    Reason
                  </Text>
                  <Text size="sm" fw={600}>
                    {selectedAdjustment.reason}
                  </Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">
                    Adjusted At
                  </Text>
                  <Text size="sm">
                    {new Date(selectedAdjustment.adjusted_at || selectedAdjustment.created_at).toLocaleString()}
                  </Text>
                </div>
              </Group>

              <Table highlightOnHover>
                <Table.Thead style={{ background: '#f8fafc' }}>
                  <Table.Tr>
                    <Table.Th>Medicine</Table.Th>
                    <Table.Th>Batch</Table.Th>
                    <Table.Th>System</Table.Th>
                    <Table.Th>Counted</Table.Th>
                    <Table.Th>Difference</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {selectedAdjustment.items?.map((it, i) => (
                    <Table.Tr key={i}>
                      <Table.Td>
                        <Text size="sm" fw={600}>
                          {it.medicine?.name || `Medicine #${it.medicine_id}`}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs">{it.batch?.batch_number || 'N/A'}</Text>
                      </Table.Td>
                      <Table.Td>{it.system_quantity}</Table.Td>
                      <Table.Td>{it.counted_quantity}</Table.Td>
                      <Table.Td>
                        <Badge size="xs" color={Number(it.difference) >= 0 ? 'green' : 'red'}>
                          {Number(it.difference) > 0 ? `+${it.difference}` : it.difference}
                        </Badge>
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
