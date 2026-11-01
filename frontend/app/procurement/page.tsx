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
  Table,
  Tabs,
  Text,
  TextInput,
  Textarea,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconCheck,
  IconCircleCheck,
  IconClipboardCheck,
  IconClipboardList,
  IconFileInvoice,
  IconPackageImport,
  IconPlus,
  IconSend,
  IconTrash,
  IconTruck,
  IconX,
} from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppShell } from '@/components/app-shell';
import { getMedicines } from '@/features/catalog/api';
import { getSuppliers } from '@/features/master-data/api';
import {
  GoodsReceipt,
  PurchaseOrder,
  createGoodsReceipt,
  createPurchaseOrder,
  getGoodsReceipts,
  getPurchaseOrders,
  updatePurchaseOrderStatus,
} from '@/features/procurement/api';
import { useAuthStore } from '@/stores/auth-store';

export default function ProcurementPage() {
  const queryClient = useQueryClient();
  const { tenantId, tenants } = useAuthStore();
  const currentTenant = tenants.find((t) => t.id === tenantId);
  const currency = currentTenant?.currency_code || 'PKR';

  const [activeTab, setActiveTab] = useState<string | null>('orders');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals
  const [poModalOpened, { open: openPoModal, close: closePoModal }] = useDisclosure(false);
  const [grnModalOpened, { open: openGrnModal, close: closeGrnModal }] = useDisclosure(false);
  const [detailModalOpened, { open: openDetailModal, close: closeDetailModal }] = useDisclosure(false);
  const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null);
  const [grnDetailModalOpened, { open: openGrnDetailModal, close: closeGrnDetailModal }] = useDisclosure(false);
  const [selectedGrn, setSelectedGrn] = useState<GoodsReceipt | null>(null);

  // Queries
  const { data: posData, isLoading: isLoadingPos } = useQuery({
    queryKey: ['purchase-orders', statusFilter],
    queryFn: () => getPurchaseOrders(statusFilter),
  });

  const { data: grnsData, isLoading: isLoadingGrns } = useQuery({
    queryKey: ['goods-receipts'],
    queryFn: () => getGoodsReceipts(),
  });

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers-lookup'],
    queryFn: () => getSuppliers(),
  });

  const { data: medicinesData } = useQuery({
    queryKey: ['medicines-lookup'],
    queryFn: () => getMedicines(),
  });

  const purchaseOrders = posData?.data || [];
  const goodsReceipts = grnsData?.data || [];
  const suppliers = suppliersData?.data || [];
  const medicines = medicinesData?.data || [];

  // PO Form State
  const [poForm, setPoForm] = useState({
    supplier_id: '',
    order_date: new Date().toISOString().split('T')[0],
    expected_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: '',
    items: [
      {
        medicine_id: '',
        quantity_ordered: 100,
        unit_price: 50,
      },
    ],
  });

  // GRN Form State
  const [grnForm, setGrnForm] = useState<{
    purchase_order_id: string | null;
    supplier_id: string;
    invoice_number: string;
    received_date: string;
    notes: string;
    items: Array<{
      medicine_id: string;
      batch_number: string;
      expiry_date: string;
      quantity_received: number;
      unit_cost: number;
      selling_price: number;
    }>;
  }>({
    purchase_order_id: null,
    supplier_id: '',
    invoice_number: '',
    received_date: new Date().toISOString().split('T')[0],
    notes: '',
    items: [
      {
        medicine_id: '',
        batch_number: `BATCH-${Date.now().toString().slice(-6)}`,
        expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        quantity_received: 100,
        unit_cost: 50,
        selling_price: 75,
      },
    ],
  });

  // Mutations
  const createPoMutation = useMutation({
    mutationFn: (data: any) => createPurchaseOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      notifications.show({
        title: 'Purchase Order Created',
        message: 'New PO drafted successfully.',
        color: 'teal',
        icon: <IconCheck size={18} />,
      });
      closePoModal();
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Failed to Create PO',
        message: err?.message || 'Check PO details and try again.',
        color: 'red',
      });
    },
  });

  const updatePoStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'draft' | 'ordered' | 'cancelled' }) =>
      updatePurchaseOrderStatus(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      notifications.show({
        title: 'PO Status Updated',
        message: 'Purchase order status changed successfully.',
        color: 'teal',
        icon: <IconCheck size={18} />,
      });
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Update Failed',
        message: err?.message || 'Could not update PO status.',
        color: 'red',
      });
    },
  });

  const createGrnMutation = useMutation({
    mutationFn: (data: any) => createGoodsReceipt(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goods-receipts'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      notifications.show({
        title: 'Goods Received (GRN Created)',
        message: 'Inventory batches and stock movements have been updated automatically.',
        color: 'teal',
        icon: <IconCheck size={18} />,
      });
      closeGrnModal();
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Receiving Failed',
        message: err?.message || 'Check GRN inputs and try again.',
        color: 'red',
      });
    },
  });

  // Handlers for PO
  const handleOpenCreatePo = () => {
    setPoForm({
      supplier_id: suppliers[0]?.id ? String(suppliers[0].id) : '',
      order_date: new Date().toISOString().split('T')[0],
      expected_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: '',
      items: [
        {
          medicine_id: medicines[0]?.id ? String(medicines[0].id) : '',
          quantity_ordered: 50,
          unit_price: 60,
        },
      ],
    });
    openPoModal();
  };

  const handleAddPoItem = () => {
    setPoForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          medicine_id: medicines[0]?.id ? String(medicines[0].id) : '',
          quantity_ordered: 50,
          unit_price: 50,
        },
      ],
    }));
  };

  const handleRemovePoItem = (index: number) => {
    setPoForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleUpdatePoItem = (index: number, field: string, val: any) => {
    setPoForm((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: val };
      return { ...prev, items };
    });
  };

  const handleSubmitPo = () => {
    if (!poForm.supplier_id) {
      notifications.show({ title: 'Validation Error', message: 'Please select a supplier.', color: 'red' });
      return;
    }
    const hasEmptyMed = poForm.items.some((it) => !it.medicine_id);
    if (hasEmptyMed) {
      notifications.show({ title: 'Validation Error', message: 'All items must have a medicine selected.', color: 'red' });
      return;
    }

    createPoMutation.mutate({
      supplier_id: Number(poForm.supplier_id),
      order_date: poForm.order_date,
      expected_date: poForm.expected_date || null,
      notes: poForm.notes || null,
      items: poForm.items.map((it) => ({
        medicine_id: Number(it.medicine_id),
        quantity_ordered: Number(it.quantity_ordered),
        unit_price: Number(it.unit_price),
      })),
    });
  };

  // Handlers for GRN
  const handleOpenReceiveGoods = (prefilledPo?: PurchaseOrder) => {
    if (prefilledPo) {
      setGrnForm({
        purchase_order_id: String(prefilledPo.id),
        supplier_id: String(prefilledPo.supplier_id),
        invoice_number: `INV-${prefilledPo.po_number.replace('PO-', '')}`,
        received_date: new Date().toISOString().split('T')[0],
        notes: `Received from ${prefilledPo.po_number}`,
        items: prefilledPo.items.map((it) => ({
          medicine_id: String(it.medicine_id),
          batch_number: `BATCH-${Date.now().toString().slice(-5)}`,
          expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          quantity_received: Number(it.quantity_ordered) - (Number(it.quantity_received) || 0),
          unit_cost: Number(it.unit_price),
          selling_price: Math.round(Number(it.unit_price) * 1.3),
        })),
      });
    } else {
      setGrnForm({
        purchase_order_id: null,
        supplier_id: suppliers[0]?.id ? String(suppliers[0].id) : '',
        invoice_number: `INV-${Date.now().toString().slice(-6)}`,
        received_date: new Date().toISOString().split('T')[0],
        notes: '',
        items: [
          {
            medicine_id: medicines[0]?.id ? String(medicines[0].id) : '',
            batch_number: `BATCH-${Date.now().toString().slice(-6)}`,
            expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            quantity_received: 100,
            unit_cost: 50,
            selling_price: 75,
          },
        ],
      });
    }
    openGrnModal();
  };

  const handleAddGrnItem = () => {
    setGrnForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          medicine_id: medicines[0]?.id ? String(medicines[0].id) : '',
          batch_number: `BATCH-${Date.now().toString().slice(-6)}`,
          expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          quantity_received: 50,
          unit_cost: 50,
          selling_price: 75,
        },
      ],
    }));
  };

  const handleRemoveGrnItem = (index: number) => {
    setGrnForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleUpdateGrnItem = (index: number, field: string, val: any) => {
    setGrnForm((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: val };
      return { ...prev, items };
    });
  };

  const handleSubmitGrn = () => {
    if (!grnForm.supplier_id) {
      notifications.show({ title: 'Validation Error', message: 'Supplier is required.', color: 'red' });
      return;
    }
    const invalid = grnForm.items.some(
      (it) => !it.medicine_id || !it.batch_number || !it.expiry_date || it.quantity_received <= 0
    );
    if (invalid) {
      notifications.show({
        title: 'Validation Error',
        message: 'Ensure medicine, batch number, expiry date, and positive quantity are provided for each item.',
        color: 'red',
      });
      return;
    }

    createGrnMutation.mutate({
      purchase_order_id: grnForm.purchase_order_id ? Number(grnForm.purchase_order_id) : null,
      supplier_id: Number(grnForm.supplier_id),
      invoice_number: grnForm.invoice_number || null,
      received_date: grnForm.received_date,
      notes: grnForm.notes || null,
      items: grnForm.items.map((it) => ({
        medicine_id: Number(it.medicine_id),
        batch_number: it.batch_number,
        expiry_date: it.expiry_date,
        quantity_received: Number(it.quantity_received),
        unit_cost: Number(it.unit_cost),
        selling_price: Number(it.selling_price),
      })),
    });
  };

  // Totals calculations
  const poTotalSum = poForm.items.reduce((acc, it) => acc + (it.quantity_ordered * it.unit_price || 0), 0);
  const grnTotalSum = grnForm.items.reduce((acc, it) => acc + (it.quantity_received * it.unit_cost || 0), 0);

  // KPIs
  const totalOrdersCount = purchaseOrders.length;
  const orderedCount = purchaseOrders.filter((po) => po.status === 'ordered').length;
  const receivedCount = purchaseOrders.filter((po) => po.status === 'received').length;
  const totalSpend = goodsReceipts.reduce((acc, grn) => acc + Number(grn.total_amount), 0);

  return (
    <AppShell>
      <main className="content">
        <Group justify="space-between" align="flex-start" mb="lg">
          <div>
            <div className="eyebrow">Purchasing & Vendor Management</div>
            <h1 className="page-title">Procurement</h1>
            <p className="page-subtitle">
              Manage purchase orders, supplier shipments, goods receiving notes (GRN), and automated batch intake.
            </p>
          </div>
          <Group>
            {activeTab === 'orders' && (
              <Button leftSection={<IconPlus size={18} />} color="teal" onClick={handleOpenCreatePo}>
                Create Purchase Order
              </Button>
            )}
            <Button
              leftSection={<IconPackageImport size={18} />}
              variant={activeTab === 'receipts' ? 'filled' : 'light'}
              color="teal"
              onClick={() => handleOpenReceiveGoods()}
            >
              Receive Goods (GRN)
            </Button>
          </Group>
        </Group>

        {/* Top KPI Cards */}
        <Grid mb="xl">
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Paper p="md" radius="md" style={{ border: '1px solid #e2e8f0', background: '#ffffff' }}>
              <Group justify="space-between" mb="xs">
                <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                  Total Orders
                </Text>
                <IconClipboardList size={18} color="#0d9488" />
              </Group>
              <Text size="xl" fw={700} c="#0f172a">
                {totalOrdersCount}
              </Text>
              <Text size="xs" c="dimmed">
                Purchase orders placed
              </Text>
            </Paper>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Paper p="md" radius="md" style={{ border: '1px solid #bae6fd', background: '#f0f9ff' }}>
              <Group justify="space-between" mb="xs">
                <Text size="xs" c="sky.8" fw={600} tt="uppercase">
                  Awaiting Delivery
                </Text>
                <IconTruck size={18} color="#0284c7" />
              </Group>
              <Text size="xl" fw={700} c="sky.9">
                {orderedCount}
              </Text>
              <Text size="xs" c="sky.7">
                POs with status Ordered
              </Text>
            </Paper>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Paper p="md" radius="md" style={{ border: '1px solid #bbf7d0', background: '#f0fdf4' }}>
              <Group justify="space-between" mb="xs">
                <Text size="xs" c="green.8" fw={600} tt="uppercase">
                  Fulfilled & Received
                </Text>
                <IconClipboardCheck size={18} color="#16a34a" />
              </Group>
              <Text size="xl" fw={700} c="green.9">
                {receivedCount}
              </Text>
              <Text size="xs" c="green.7">
                In stock via GRN
              </Text>
            </Paper>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Paper p="md" radius="md" style={{ border: '1px solid #e2e8f0', background: '#ffffff' }}>
              <Group justify="space-between" mb="xs">
                <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                  Total Procurement Spend
                </Text>
                <IconFileInvoice size={18} color="#6366f1" />
              </Group>
              <Text size="xl" fw={700} c="#0f172a">
                {currency} {totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </Text>
              <Text size="xs" c="dimmed">
                Processed across {goodsReceipts.length} GRNs
              </Text>
            </Paper>
          </Grid.Col>
        </Grid>

        {/* Tabs */}
        <Tabs value={activeTab} onChange={setActiveTab} color="teal">
          <Tabs.List mb="lg">
            <Tabs.Tab value="orders" leftSection={<IconClipboardList size={16} />}>
              Purchase Orders ({purchaseOrders.length})
            </Tabs.Tab>
            <Tabs.Tab value="receipts" leftSection={<IconPackageImport size={16} />}>
              Goods Receipts Notes (GRN) ({goodsReceipts.length})
            </Tabs.Tab>
          </Tabs.List>

          {/* TAB 1: PURCHASE ORDERS */}
          <Tabs.Panel value="orders">
            <Paper p="md" radius="md" style={{ border: '1px solid #e2e8f0', background: '#ffffff' }}>
              <Group justify="space-between" mb="md">
                <Select
                  label="Filter by Status"
                  value={statusFilter}
                  onChange={(val) => setStatusFilter(val || 'all')}
                  data={[
                    { value: 'all', label: 'All Orders' },
                    { value: 'draft', label: 'Draft' },
                    { value: 'ordered', label: 'Ordered / Dispatched' },
                    { value: 'received', label: 'Received' },
                    { value: 'cancelled', label: 'Cancelled' },
                  ]}
                  style={{ width: 220 }}
                />
                <Text size="xs" c="dimmed">
                  Manage vendor requisitions and supply chain workflows
                </Text>
              </Group>

              {isLoadingPos ? (
                <Text p="xl" ta="center" c="dimmed">
                  Loading purchase orders...
                </Text>
              ) : purchaseOrders.length === 0 ? (
                <Alert color="teal" variant="light" title="No purchase orders found">
                  Create a purchase order to request stock from approved pharmaceutical suppliers.
                </Alert>
              ) : (
                <Table highlightOnHover verticalSpacing="sm">
                  <Table.Thead style={{ background: '#f8fafc' }}>
                    <Table.Tr>
                      <Table.Th>PO #</Table.Th>
                      <Table.Th>Supplier</Table.Th>
                      <Table.Th>Order Date</Table.Th>
                      <Table.Th>Expected Date</Table.Th>
                      <Table.Th>Items Count</Table.Th>
                      <Table.Th>Total Amount</Table.Th>
                      <Table.Th>Status</Table.Th>
                      <Table.Th style={{ width: 170 }}>Actions</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {purchaseOrders.map((po) => {
                      const statusColor =
                        po.status === 'received'
                          ? 'teal'
                          : po.status === 'ordered'
                          ? 'blue'
                          : po.status === 'draft'
                          ? 'gray'
                          : 'red';

                      return (
                        <Table.Tr key={po.id}>
                          <Table.Td>
                            <Text size="sm" fw={700} c="teal.8">
                              {po.po_number}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" fw={600} c="#0f172a">
                              {po.supplier?.name || `Supplier #${po.supplier_id}`}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {po.supplier?.phone || po.supplier?.email || ''}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="xs">{new Date(po.order_date).toLocaleDateString()}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="xs" c="dimmed">
                              {po.expected_date ? new Date(po.expected_date).toLocaleDateString() : '—'}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Badge size="sm" variant="light" color="blue">
                              {po.items?.length || 0} Lines
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" fw={700} c="#0f172a">
                              {currency} {Number(po.total_amount).toFixed(2)}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Badge size="sm" color={statusColor} variant="filled">
                              {po.status.toUpperCase()}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Group gap={4}>
                              <Button
                                size="xs"
                                variant="subtle"
                                color="teal"
                                onClick={() => {
                                  setSelectedPo(po);
                                  openDetailModal();
                                }}
                              >
                                View
                              </Button>

                              {po.status === 'draft' && (
                                <Tooltip label="Dispatch to Supplier">
                                  <ActionIcon
                                    size="sm"
                                    color="blue"
                                    variant="light"
                                    onClick={() => updatePoStatusMutation.mutate({ id: po.id, status: 'ordered' })}
                                  >
                                    <IconSend size={14} />
                                  </ActionIcon>
                                </Tooltip>
                              )}

                              {po.status === 'ordered' && (
                                <Button
                                  size="xs"
                                  color="teal"
                                  variant="light"
                                  leftSection={<IconPackageImport size={12} />}
                                  onClick={() => handleOpenReceiveGoods(po)}
                                >
                                  Receive
                                </Button>
                              )}

                              {(po.status === 'draft' || po.status === 'ordered') && (
                                <Tooltip label="Cancel Purchase Order">
                                  <ActionIcon
                                    size="sm"
                                    color="red"
                                    variant="subtle"
                                    onClick={() => updatePoStatusMutation.mutate({ id: po.id, status: 'cancelled' })}
                                  >
                                    <IconX size={14} />
                                  </ActionIcon>
                                </Tooltip>
                              )}
                            </Group>
                          </Table.Td>
                        </Table.Tr>
                      );
                    })}
                  </Table.Tbody>
                </Table>
              )}
            </Paper>
          </Tabs.Panel>

          {/* TAB 2: GOODS RECEIPTS NOTES (GRN) */}
          <Tabs.Panel value="receipts">
            <Paper p="md" radius="md" style={{ border: '1px solid #e2e8f0', background: '#ffffff' }}>
              <Group justify="space-between" mb="md">
                <Text size="sm" fw={600} c="#0f172a">
                  Historical Goods Receipts Notes (GRN)
                </Text>
                <Button
                  leftSection={<IconPackageImport size={16} />}
                  color="teal"
                  size="xs"
                  onClick={() => handleOpenReceiveGoods()}
                >
                  Receive Goods (GRN)
                </Button>
              </Group>

              {isLoadingGrns ? (
                <Text p="xl" ta="center" c="dimmed">
                  Loading goods receipts...
                </Text>
              ) : goodsReceipts.length === 0 ? (
                <Alert color="teal" variant="light" title="No goods receipts on file">
                  When deliveries arrive at the pharmacy, record a Goods Receipt to intake stock and register batch numbers.
                </Alert>
              ) : (
                <Table highlightOnHover verticalSpacing="sm">
                  <Table.Thead style={{ background: '#f8fafc' }}>
                    <Table.Tr>
                      <Table.Th>GRN #</Table.Th>
                      <Table.Th>Supplier</Table.Th>
                      <Table.Th>Invoice #</Table.Th>
                      <Table.Th>Received Date</Table.Th>
                      <Table.Th>Items Intake</Table.Th>
                      <Table.Th>Total Cost</Table.Th>
                      <Table.Th>Payment Status</Table.Th>
                      <Table.Th>Received By</Table.Th>
                      <Table.Th style={{ width: 80 }}>Action</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {goodsReceipts.map((grn) => (
                      <Table.Tr key={grn.id}>
                        <Table.Td>
                          <Text size="sm" fw={700} c="teal.8">
                            {grn.grn_number}
                          </Text>
                          {grn.purchase_order_id && (
                            <Text size="xs" c="dimmed">
                              PO #{grn.purchase_order_id}
                            </Text>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" fw={600} c="#0f172a">
                            {grn.supplier?.name || `Supplier #${grn.supplier_id}`}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs" fw={500}>
                            {grn.invoice_number || '—'}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs">{new Date(grn.received_date).toLocaleDateString()}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge size="sm" variant="light" color="teal">
                            {grn.items?.length || 0} Batches Registered
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" fw={700} c="#0f172a">
                            {currency} {Number(grn.total_amount).toFixed(2)}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge size="xs" color="gray" variant="light">
                            {grn.payment_status.toUpperCase()}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs">{grn.creator?.name || 'Administrator'}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Button
                            size="xs"
                            variant="subtle"
                            color="teal"
                            onClick={() => {
                              setSelectedGrn(grn);
                              openGrnDetailModal();
                            }}
                          >
                            View
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

        {/* MODAL: CREATE PURCHASE ORDER */}
        <Modal opened={poModalOpened} onClose={closePoModal} title="Create Purchase Order" size="xl" centered>
          <Stack gap="md">
            <Grid>
              <Grid.Col span={6}>
                <Select
                  label="Supplier"
                  placeholder="Choose supplier"
                  required
                  searchable
                  value={poForm.supplier_id}
                  onChange={(val) => setPoForm((prev) => ({ ...prev, supplier_id: val || '' }))}
                  data={suppliers.map((s) => ({
                    value: String(s.id),
                    label: s.name,
                  }))}
                />
              </Grid.Col>
              <Grid.Col span={3}>
                <TextInput
                  label="Order Date"
                  type="date"
                  required
                  value={poForm.order_date}
                  onChange={(e) => setPoForm((prev) => ({ ...prev, order_date: e.currentTarget.value }))}
                />
              </Grid.Col>
              <Grid.Col span={3}>
                <TextInput
                  label="Expected Date"
                  type="date"
                  value={poForm.expected_date}
                  onChange={(e) => setPoForm((prev) => ({ ...prev, expected_date: e.currentTarget.value }))}
                />
              </Grid.Col>
            </Grid>

            <Text size="sm" fw={600} c="#0f172a" mt="xs">
              Order Items
            </Text>

            {poForm.items.map((it, idx) => {
              const lineSubtotal = it.quantity_ordered * it.unit_price;
              return (
                <Paper key={idx} p="sm" radius="md" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <Grid align="flex-end">
                    <Grid.Col span={{ base: 12, sm: 5 }}>
                      <Select
                        label="Medicine"
                        placeholder="Select medicine"
                        searchable
                        required
                        value={it.medicine_id}
                        onChange={(val) => handleUpdatePoItem(idx, 'medicine_id', val || '')}
                        data={medicines.map((m) => ({
                          value: String(m.id),
                          label: `${m.name} (${m.sku})`,
                        }))}
                      />
                    </Grid.Col>

                    <Grid.Col span={{ base: 6, sm: 3 }}>
                      <NumberInput
                        label="Quantity Ordered"
                        min={1}
                        value={it.quantity_ordered}
                        onChange={(val) => handleUpdatePoItem(idx, 'quantity_ordered', Number(val) || 0)}
                      />
                    </Grid.Col>

                    <Grid.Col span={{ base: 6, sm: 3 }}>
                      <NumberInput
                        label={`Unit Price (${currency})`}
                        min={0}
                        decimalScale={2}
                        value={it.unit_price}
                        onChange={(val) => handleUpdatePoItem(idx, 'unit_price', Number(val) || 0)}
                      />
                    </Grid.Col>

                    <Grid.Col span={{ base: 12, sm: 1 }}>
                      <Group justify="flex-end">
                        <ActionIcon
                          color="red"
                          variant="subtle"
                          disabled={poForm.items.length === 1}
                          onClick={() => handleRemovePoItem(idx)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Grid.Col>
                  </Grid>

                  <Group justify="flex-end" mt="xs">
                    <Text size="xs" fw={600} c="teal.8">
                      Subtotal: {currency} {lineSubtotal.toFixed(2)}
                    </Text>
                  </Group>
                </Paper>
              );
            })}

            <Button variant="light" color="teal" size="xs" leftSection={<IconPlus size={14} />} onClick={handleAddPoItem}>
              Add Another Item
            </Button>

            <TextInput
              label="Purchase Notes (Optional)"
              placeholder="e.g. Urgent shipment, delivery to back warehouse entrance"
              value={poForm.notes}
              onChange={(e) => setPoForm((prev) => ({ ...prev, notes: e.currentTarget.value }))}
            />

            <Paper p="sm" radius="md" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <Group justify="space-between">
                <Text size="sm" fw={600} c="green.9">
                  Total Order Amount
                </Text>
                <Text size="lg" fw={700} c="green.9">
                  {currency} {poTotalSum.toFixed(2)}
                </Text>
              </Group>
            </Paper>

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closePoModal}>
                Cancel
              </Button>
              <Button color="teal" onClick={handleSubmitPo} loading={createPoMutation.isPending}>
                Create Purchase Order
              </Button>
            </Group>
          </Stack>
        </Modal>

        {/* MODAL: RECEIVE GOODS (GRN) */}
        <Modal
          opened={grnModalOpened}
          onClose={closeGrnModal}
          title="Receive Goods (GRN - Goods Receiving Note)"
          size="90%"
          centered
        >
          <Stack gap="md">
            <Alert color="teal" variant="light" icon={<IconCircleCheck size={16} />}>
              Intaking goods automatically generates or updates inventory batches in the FEFO queue and logs stock
              movement audit trails.
            </Alert>

            <Grid>
              <Grid.Col span={{ base: 12, sm: 4 }}>
                <Select
                  label="Supplier"
                  placeholder="Choose supplier"
                  required
                  searchable
                  value={grnForm.supplier_id}
                  onChange={(val) => setGrnForm((prev) => ({ ...prev, supplier_id: val || '' }))}
                  data={suppliers.map((s) => ({
                    value: String(s.id),
                    label: s.name,
                  }))}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 4 }}>
                <TextInput
                  label="Supplier Invoice # (Optional)"
                  placeholder="e.g. INV-40291"
                  value={grnForm.invoice_number}
                  onChange={(e) => setGrnForm((prev) => ({ ...prev, invoice_number: e.currentTarget.value }))}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 4 }}>
                <TextInput
                  label="Date Received"
                  type="date"
                  required
                  value={grnForm.received_date}
                  onChange={(e) => setGrnForm((prev) => ({ ...prev, received_date: e.currentTarget.value }))}
                />
              </Grid.Col>
            </Grid>

            <Text size="sm" fw={600} c="#0f172a" mt="xs">
              Delivery Batches Received
            </Text>

            {grnForm.items.map((it, idx) => {
              const subtotal = it.quantity_received * it.unit_cost;
              return (
                <Paper key={idx} p="sm" radius="md" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <Grid align="flex-end">
                    <Grid.Col span={{ base: 12, sm: 3 }}>
                      <Select
                        label="Medicine"
                        placeholder="Choose medicine"
                        searchable
                        required
                        value={it.medicine_id}
                        onChange={(val) => handleUpdateGrnItem(idx, 'medicine_id', val || '')}
                        data={medicines.map((m) => ({
                          value: String(m.id),
                          label: `${m.name} (${m.sku})`,
                        }))}
                      />
                    </Grid.Col>

                    <Grid.Col span={{ base: 6, sm: 2 }}>
                      <TextInput
                        label="Batch #"
                        placeholder="e.g. B-9920"
                        required
                        value={it.batch_number}
                        onChange={(e) => handleUpdateGrnItem(idx, 'batch_number', e.currentTarget.value)}
                      />
                    </Grid.Col>

                    <Grid.Col span={{ base: 6, sm: 2 }}>
                      <TextInput
                        label="Expiry Date"
                        type="date"
                        required
                        value={it.expiry_date}
                        onChange={(e) => handleUpdateGrnItem(idx, 'expiry_date', e.currentTarget.value)}
                      />
                    </Grid.Col>

                    <Grid.Col span={{ base: 6, sm: 1.5 }}>
                      <NumberInput
                        label="Qty Received"
                        min={1}
                        value={it.quantity_received}
                        onChange={(val) => handleUpdateGrnItem(idx, 'quantity_received', Number(val) || 0)}
                      />
                    </Grid.Col>

                    <Grid.Col span={{ base: 6, sm: 1.5 }}>
                      <NumberInput
                        label={`Cost (${currency})`}
                        min={0}
                        decimalScale={2}
                        value={it.unit_cost}
                        onChange={(val) => handleUpdateGrnItem(idx, 'unit_cost', Number(val) || 0)}
                      />
                    </Grid.Col>

                    <Grid.Col span={{ base: 6, sm: 1.5 }}>
                      <NumberInput
                        label={`Retail Price`}
                        min={0}
                        decimalScale={2}
                        value={it.selling_price}
                        onChange={(val) => handleUpdateGrnItem(idx, 'selling_price', Number(val) || 0)}
                      />
                    </Grid.Col>

                    <Grid.Col span={{ base: 6, sm: 0.5 }}>
                      <ActionIcon
                        color="red"
                        variant="subtle"
                        disabled={grnForm.items.length === 1}
                        onClick={() => handleRemoveGrnItem(idx)}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Grid.Col>
                  </Grid>

                  <Group justify="flex-end" mt="xs">
                    <Text size="xs" fw={600} c="teal.8">
                      Line Cost: {currency} {subtotal.toFixed(2)}
                    </Text>
                  </Group>
                </Paper>
              );
            })}

            <Button variant="light" color="teal" size="xs" leftSection={<IconPlus size={14} />} onClick={handleAddGrnItem}>
              Add Another Batch Line
            </Button>

            <Paper p="sm" radius="md" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <Group justify="space-between">
                <Text size="sm" fw={600} c="green.9">
                  Total GRN Shipment Value
                </Text>
                <Text size="lg" fw={700} c="green.9">
                  {currency} {grnTotalSum.toFixed(2)}
                </Text>
              </Group>
            </Paper>

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeGrnModal}>
                Cancel
              </Button>
              <Button color="teal" onClick={handleSubmitGrn} loading={createGrnMutation.isPending}>
                Complete Goods Intake
              </Button>
            </Group>
          </Stack>
        </Modal>

        {/* MODAL: VIEW PO DETAILS */}
        <Modal
          opened={detailModalOpened}
          onClose={closeDetailModal}
          title={`Purchase Order ${selectedPo?.po_number}`}
          size="lg"
          centered
        >
          {selectedPo && (
            <Stack gap="md">
              <Group justify="space-between">
                <div>
                  <Text size="xs" c="dimmed">
                    Supplier
                  </Text>
                  <Text size="sm" fw={600}>
                    {selectedPo.supplier?.name}
                  </Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">
                    Status
                  </Text>
                  <Badge color={selectedPo.status === 'received' ? 'teal' : 'blue'}>
                    {selectedPo.status.toUpperCase()}
                  </Badge>
                </div>
              </Group>

              <Table highlightOnHover>
                <Table.Thead style={{ background: '#f8fafc' }}>
                  <Table.Tr>
                    <Table.Th>Medicine</Table.Th>
                    <Table.Th>Qty Ordered</Table.Th>
                    <Table.Th>Qty Received</Table.Th>
                    <Table.Th>Unit Price</Table.Th>
                    <Table.Th>Subtotal</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {selectedPo.items?.map((it, idx) => (
                    <Table.Tr key={idx}>
                      <Table.Td>
                        <Text size="sm" fw={600}>
                          {it.medicine?.name || `Medicine #${it.medicine_id}`}
                        </Text>
                      </Table.Td>
                      <Table.Td>{it.quantity_ordered}</Table.Td>
                      <Table.Td>
                        <Badge size="xs" color={it.quantity_received ? 'teal' : 'gray'}>
                          {it.quantity_received || 0}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        {currency} {Number(it.unit_price).toFixed(2)}
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" fw={600}>
                          {currency} {Number(it.subtotal).toFixed(2)}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>

              <Group justify="space-between">
                <Text size="sm" fw={600}>
                  Total Amount:
                </Text>
                <Text size="md" fw={700} c="teal.8">
                  {currency} {Number(selectedPo.total_amount).toFixed(2)}
                </Text>
              </Group>

              <Group justify="flex-end" mt="md">
                <Button variant="default" onClick={closeDetailModal}>
                  Close
                </Button>
              </Group>
            </Stack>
          )}
        </Modal>

        {/* MODAL: VIEW GRN DETAILS */}
        <Modal
          opened={grnDetailModalOpened}
          onClose={closeGrnDetailModal}
          title={`Goods Receipt Note ${selectedGrn?.grn_number}`}
          size="lg"
          centered
        >
          {selectedGrn && (
            <Stack gap="md">
              <Group justify="space-between">
                <div>
                  <Text size="xs" c="dimmed">
                    Supplier & Invoice
                  </Text>
                  <Text size="sm" fw={600}>
                    {selectedGrn.supplier?.name} {selectedGrn.invoice_number ? `(${selectedGrn.invoice_number})` : ''}
                  </Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">
                    Received Date
                  </Text>
                  <Text size="sm">{new Date(selectedGrn.received_date).toLocaleDateString()}</Text>
                </div>
              </Group>

              <Table highlightOnHover>
                <Table.Thead style={{ background: '#f8fafc' }}>
                  <Table.Tr>
                    <Table.Th>Medicine</Table.Th>
                    <Table.Th>Batch #</Table.Th>
                    <Table.Th>Expiry</Table.Th>
                    <Table.Th>Qty Intake</Table.Th>
                    <Table.Th>Cost</Table.Th>
                    <Table.Th>Subtotal</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {selectedGrn.items?.map((it, idx) => (
                    <Table.Tr key={idx}>
                      <Table.Td>
                        <Text size="sm" fw={600}>
                          {it.medicine?.name || `Medicine #${it.medicine_id}`}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge size="xs" variant="outline" color="dark">
                          {it.batch_number}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs">{new Date(it.expiry_date).toLocaleDateString()}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge size="xs" color="teal">
                          {it.quantity_received}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        {currency} {Number(it.unit_cost).toFixed(2)}
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" fw={600}>
                          {currency} {Number(it.subtotal).toFixed(2)}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>

              <Group justify="space-between">
                <Text size="sm" fw={600}>
                  Total Shipment Cost:
                </Text>
                <Text size="md" fw={700} c="teal.8">
                  {currency} {Number(selectedGrn.total_amount).toFixed(2)}
                </Text>
              </Group>

              <Group justify="flex-end" mt="md">
                <Button variant="default" onClick={closeGrnDetailModal}>
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
