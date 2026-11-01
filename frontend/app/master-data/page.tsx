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
  IconBuildingFactory,
  IconBuildingStore,
  IconCheck,
  IconEdit,
  IconPlus,
  IconRuler,
  IconSearch,
  IconTrash,
  IconUsers,
} from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppShell } from '@/components/app-shell';
import {
  Customer,
  Manufacturer,
  Supplier,
  UnitOfMeasurement,
  createCustomer,
  createManufacturer,
  createSupplier,
  createUnitOfMeasurement,
  deleteCustomer,
  deleteManufacturer,
  deleteSupplier,
  deleteUnitOfMeasurement,
  getCustomers,
  getManufacturers,
  getSuppliers,
  getUnitsOfMeasurement,
  updateCustomer,
  updateManufacturer,
  updateSupplier,
  updateUnitOfMeasurement,
} from '@/features/master-data/api';
import { useAuthStore } from '@/stores/auth-store';

export default function MasterDataPage() {
  const token = useAuthStore((state) => state.accessToken);
  const currentTenantId = useAuthStore((state) => state.tenantId);
  const tenants = useAuthStore((state) => state.tenants);
  const currentTenant = tenants.find((t) => t.id === currentTenantId);
  const currency = currentTenant?.currency_code ?? 'PKR';

  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string | null>('suppliers');
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 200);

  // Supplier modal & form state
  const [supplierModalOpened, { open: openSupplierModal, close: closeSupplierModal }] = useDisclosure(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierName, setSupplierName] = useState('');
  const [supplierContact, setSupplierContact] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [supplierEmail, setSupplierEmail] = useState('');
  const [supplierAddress, setSupplierAddress] = useState('');
  const [supplierTax, setSupplierTax] = useState('');
  const [supplierPaymentTerms, setSupplierPaymentTerms] = useState<number>(30);
  const [supplierActive, setSupplierActive] = useState(true);

  // Customer modal & form state
  const [customerModalOpened, { open: openCustomerModal, close: closeCustomerModal }] = useDisclosure(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerLoyalty, setCustomerLoyalty] = useState('');
  const [customerCreditLimit, setCustomerCreditLimit] = useState<number>(0);
  const [customerActive, setCustomerActive] = useState(true);

  // Manufacturer modal & form state
  const [mfrModalOpened, { open: openMfrModal, close: closeMfrModal }] = useDisclosure(false);
  const [editingMfr, setEditingMfr] = useState<Manufacturer | null>(null);
  const [mfrName, setMfrName] = useState('');
  const [mfrCountry, setMfrCountry] = useState('');
  const [mfrActive, setMfrActive] = useState(true);

  // UOM modal & form state
  const [uomModalOpened, { open: openUomModal, close: closeUomModal }] = useDisclosure(false);
  const [editingUom, setEditingUom] = useState<UnitOfMeasurement | null>(null);
  const [uomName, setUomName] = useState('');
  const [uomCode, setUomCode] = useState('');
  const [uomActive, setUomActive] = useState(true);

  // Queries
  const { data: suppliersData, isPending: suppliersLoading } = useQuery({
    queryKey: ['suppliers', debouncedSearch, currentTenantId],
    queryFn: () => getSuppliers(debouncedSearch),
    enabled: Boolean(token) && activeTab === 'suppliers',
  });

  const { data: customersData, isPending: customersLoading } = useQuery({
    queryKey: ['customers', debouncedSearch, currentTenantId],
    queryFn: () => getCustomers(debouncedSearch),
    enabled: Boolean(token) && activeTab === 'customers',
  });

  const { data: mfrData, isPending: mfrLoading } = useQuery({
    queryKey: ['manufacturers', debouncedSearch, currentTenantId],
    queryFn: () => getManufacturers(debouncedSearch),
    enabled: Boolean(token) && activeTab === 'manufacturers',
  });

  const { data: uomData, isPending: uomLoading } = useQuery({
    queryKey: ['uom', debouncedSearch, currentTenantId],
    queryFn: () => getUnitsOfMeasurement(debouncedSearch),
    enabled: Boolean(token) && activeTab === 'uom',
  });

  // Supplier handlers
  const handleOpenCreateSupplier = () => {
    setEditingSupplier(null);
    setSupplierName('');
    setSupplierContact('');
    setSupplierPhone('');
    setSupplierEmail('');
    setSupplierAddress('');
    setSupplierTax('');
    setSupplierPaymentTerms(30);
    setSupplierActive(true);
    openSupplierModal();
  };

  const handleOpenEditSupplier = (s: Supplier) => {
    setEditingSupplier(s);
    setSupplierName(s.name);
    setSupplierContact(s.contact_person ?? '');
    setSupplierPhone(s.phone ?? '');
    setSupplierEmail(s.email ?? '');
    setSupplierAddress(s.address ?? '');
    setSupplierTax(s.tax_number ?? '');
    setSupplierPaymentTerms(s.payment_terms_days ?? 30);
    setSupplierActive(s.is_active);
    openSupplierModal();
  };

  const saveSupplierMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: supplierName.trim(),
        contact_person: supplierContact.trim() || undefined,
        phone: supplierPhone.trim() || undefined,
        email: supplierEmail.trim() || undefined,
        address: supplierAddress.trim() || undefined,
        tax_number: supplierTax.trim() || undefined,
        payment_terms_days: supplierPaymentTerms,
        is_active: supplierActive,
      };
      return editingSupplier
        ? updateSupplier(editingSupplier.id, payload)
        : createSupplier(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      notifications.show({ title: 'Supplier Saved', message: `Supplier ${supplierName} recorded.`, color: 'teal', icon: <IconCheck size={16} /> });
      closeSupplierModal();
    },
    onError: (err: Error) => notifications.show({ title: 'Error', message: err.message, color: 'red' }),
  });

  // Customer handlers
  const handleOpenCreateCustomer = () => {
    setEditingCustomer(null);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setCustomerAddress('');
    setCustomerLoyalty('');
    setCustomerCreditLimit(0);
    setCustomerActive(true);
    openCustomerModal();
  };

  const handleOpenEditCustomer = (c: Customer) => {
    setEditingCustomer(c);
    setCustomerName(c.name);
    setCustomerPhone(c.phone ?? '');
    setCustomerEmail(c.email ?? '');
    setCustomerAddress(c.address ?? '');
    setCustomerLoyalty(c.loyalty_code ?? '');
    setCustomerCreditLimit(parseFloat(c.credit_limit) || 0);
    setCustomerActive(c.is_active);
    openCustomerModal();
  };

  const saveCustomerMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: customerName.trim(),
        phone: customerPhone.trim() || undefined,
        email: customerEmail.trim() || undefined,
        address: customerAddress.trim() || undefined,
        loyalty_code: customerLoyalty.trim() || undefined,
        credit_limit: String(customerCreditLimit),
        is_active: customerActive,
      };
      return editingCustomer
        ? updateCustomer(editingCustomer.id, payload)
        : createCustomer(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      notifications.show({ title: 'Customer Saved', message: `Customer ${customerName} recorded.`, color: 'teal', icon: <IconCheck size={16} /> });
      closeCustomerModal();
    },
    onError: (err: Error) => notifications.show({ title: 'Error', message: err.message, color: 'red' }),
  });

  // Manufacturer handlers
  const handleOpenCreateMfr = () => {
    setEditingMfr(null);
    setMfrName('');
    setMfrCountry('');
    setMfrActive(true);
    openMfrModal();
  };

  const handleOpenEditMfr = (m: Manufacturer) => {
    setEditingMfr(m);
    setMfrName(m.name);
    setMfrCountry(m.country ?? '');
    setMfrActive(m.is_active);
    openMfrModal();
  };

  const saveMfrMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: mfrName.trim(),
        country: mfrCountry.trim() || undefined,
        is_active: mfrActive,
      };
      return editingMfr
        ? updateManufacturer(editingMfr.id, payload)
        : createManufacturer(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manufacturers'] });
      notifications.show({ title: 'Manufacturer Saved', message: `Manufacturer ${mfrName} recorded.`, color: 'teal', icon: <IconCheck size={16} /> });
      closeMfrModal();
    },
    onError: (err: Error) => notifications.show({ title: 'Error', message: err.message, color: 'red' }),
  });

  // UOM handlers
  const handleOpenCreateUom = () => {
    setEditingUom(null);
    setUomName('');
    setUomCode('');
    setUomActive(true);
    openUomModal();
  };

  const handleOpenEditUom = (u: UnitOfMeasurement) => {
    setEditingUom(u);
    setUomName(u.name);
    setUomCode(u.code);
    setUomActive(u.is_active);
    openUomModal();
  };

  const saveUomMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: uomName.trim(),
        code: uomCode.trim().toUpperCase(),
        is_active: uomActive,
      };
      return editingUom
        ? updateUnitOfMeasurement(editingUom.id, payload)
        : createUnitOfMeasurement(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uom'] });
      notifications.show({ title: 'Unit Saved', message: `Unit of Measurement ${uomName} recorded.`, color: 'teal', icon: <IconCheck size={16} /> });
      closeUomModal();
    },
    onError: (err: Error) => notifications.show({ title: 'Error', message: err.message, color: 'red' }),
  });

  return (
    <AppShell>
      <main className="content" style={{ maxWidth: '100%', padding: '24px 32px' }}>
        {/* Top Header */}
        <Group justify="space-between" align="flex-end" mb="lg">
          <div>
            <div className="eyebrow">FOUNDATIONAL ENTITIES</div>
            <h1 className="page-title" style={{ margin: '4px 0 0 0' }}>
              Master Data Management
            </h1>
            <Text size="sm" c="dimmed">
              Maintain suppliers, retail & credit customers, pharmaceutical manufacturers, and measurement units.
            </Text>
          </div>

          <Group gap="sm">
            <TextInput
              placeholder="Search in active tab..."
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              w={260}
            />

            {activeTab === 'suppliers' && (
              <Button leftSection={<IconPlus size={16} />} color="teal" onClick={handleOpenCreateSupplier}>
                Add Supplier
              </Button>
            )}
            {activeTab === 'customers' && (
              <Button leftSection={<IconPlus size={16} />} color="teal" onClick={handleOpenCreateCustomer}>
                Add Customer
              </Button>
            )}
            {activeTab === 'manufacturers' && (
              <Button leftSection={<IconPlus size={16} />} color="teal" onClick={handleOpenCreateMfr}>
                Add Manufacturer
              </Button>
            )}
            {activeTab === 'uom' && (
              <Button leftSection={<IconPlus size={16} />} color="teal" onClick={handleOpenCreateUom}>
                Add Measurement Unit
              </Button>
            )}
          </Group>
        </Group>

        {/* Tabs for 4 Master Data domains */}
        <Tabs value={activeTab} onChange={setActiveTab} variant="outline" color="teal">
          <Tabs.List mb="md">
            <Tabs.Tab value="suppliers" leftSection={<IconBuildingStore size={16} />}>
              Suppliers & Distributors
            </Tabs.Tab>
            <Tabs.Tab value="customers" leftSection={<IconUsers size={16} />}>
              Customers & Patients
            </Tabs.Tab>
            <Tabs.Tab value="manufacturers" leftSection={<IconBuildingFactory size={16} />}>
              Pharmaceutical Manufacturers
            </Tabs.Tab>
            <Tabs.Tab value="uom" leftSection={<IconRuler size={16} />}>
              Units of Measurement
            </Tabs.Tab>
          </Tabs.List>

          {/* TAB 1: SUPPLIERS */}
          <Tabs.Panel value="suppliers">
            <Paper p="md" radius="md" withBorder style={{ background: '#ffffff', borderColor: '#e2ece9' }}>
              <Table striped highlightOnHover withTableBorder>
                <Table.Thead style={{ background: '#f8fafc' }}>
                  <Table.Tr>
                    <Table.Th>Supplier / Distributor</Table.Th>
                    <Table.Th>Contact Person</Table.Th>
                    <Table.Th>Phone / Email</Table.Th>
                    <Table.Th>Tax / NTN #</Table.Th>
                    <Table.Th>Payment Terms</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th ta="right">Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {suppliersLoading ? (
                    <Table.Tr><Table.Td colSpan={7} ta="center" py="xl" c="dimmed">Loading suppliers...</Table.Td></Table.Tr>
                  ) : (suppliersData?.data ?? []).length === 0 ? (
                    <Table.Tr><Table.Td colSpan={7} ta="center" py="xl" c="dimmed">No suppliers found. Click "+ Add Supplier" to register one.</Table.Td></Table.Tr>
                  ) : (
                    suppliersData?.data.map((supplier) => (
                      <Table.Tr key={supplier.id}>
                        <Table.Td>
                          <Text size="sm" fw={700} c="#0f172a">{supplier.name}</Text>
                          <Text size="xs" c="dimmed">{supplier.address || 'Address not specified'}</Text>
                        </Table.Td>
                        <Table.Td>{supplier.contact_person || '—'}</Table.Td>
                        <Table.Td>
                          <Text size="xs">{supplier.phone || '—'}</Text>
                          <Text size="xs" c="dimmed">{supplier.email || '—'}</Text>
                        </Table.Td>
                        <Table.Td>{supplier.tax_number || '—'}</Table.Td>
                        <Table.Td>{supplier.payment_terms_days} days</Table.Td>
                        <Table.Td>
                          <Badge color={supplier.is_active ? 'teal' : 'gray'} variant="light">
                            {supplier.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </Table.Td>
                        <Table.Td ta="right">
                          <Group gap="xs" justify="flex-end">
                            <ActionIcon variant="subtle" color="teal" onClick={() => handleOpenEditSupplier(supplier)}>
                              <IconEdit size={16} />
                            </ActionIcon>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))
                  )}
                </Table.Tbody>
              </Table>
            </Paper>
          </Tabs.Panel>

          {/* TAB 2: CUSTOMERS */}
          <Tabs.Panel value="customers">
            <Paper p="md" radius="md" withBorder style={{ background: '#ffffff', borderColor: '#e2ece9' }}>
              <Table striped highlightOnHover withTableBorder>
                <Table.Thead style={{ background: '#f8fafc' }}>
                  <Table.Tr>
                    <Table.Th>Customer Name</Table.Th>
                    <Table.Th>Phone / Email</Table.Th>
                    <Table.Th>Loyalty Code</Table.Th>
                    <Table.Th>Credit Limit</Table.Th>
                    <Table.Th>Outstanding Balance</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th ta="right">Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {customersLoading ? (
                    <Table.Tr><Table.Td colSpan={7} ta="center" py="xl" c="dimmed">Loading customers...</Table.Td></Table.Tr>
                  ) : (customersData?.data ?? []).length === 0 ? (
                    <Table.Tr><Table.Td colSpan={7} ta="center" py="xl" c="dimmed">No customers found. Click "+ Add Customer" to register one.</Table.Td></Table.Tr>
                  ) : (
                    customersData?.data.map((customer) => (
                      <Table.Tr key={customer.id}>
                        <Table.Td>
                          <Text size="sm" fw={700} c="#0f172a">{customer.name}</Text>
                          <Text size="xs" c="dimmed">{customer.address || 'Address not specified'}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs">{customer.phone || '—'}</Text>
                          <Text size="xs" c="dimmed">{customer.email || '—'}</Text>
                        </Table.Td>
                        <Table.Td>{customer.loyalty_code || '—'}</Table.Td>
                        <Table.Td>{currency} {parseFloat(customer.credit_limit || '0').toFixed(2)}</Table.Td>
                        <Table.Td>
                          <Text size="xs" fw={700} c={parseFloat(customer.balance) > 0 ? 'red' : 'teal'}>
                            {currency} {parseFloat(customer.balance || '0').toFixed(2)}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge color={customer.is_active ? 'teal' : 'gray'} variant="light">
                            {customer.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </Table.Td>
                        <Table.Td ta="right">
                          <Group gap="xs" justify="flex-end">
                            <ActionIcon variant="subtle" color="teal" onClick={() => handleOpenEditCustomer(customer)}>
                              <IconEdit size={16} />
                            </ActionIcon>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))
                  )}
                </Table.Tbody>
              </Table>
            </Paper>
          </Tabs.Panel>

          {/* TAB 3: MANUFACTURERS */}
          <Tabs.Panel value="manufacturers">
            <Paper p="md" radius="md" withBorder style={{ background: '#ffffff', borderColor: '#e2ece9' }}>
              <Table striped highlightOnHover withTableBorder>
                <Table.Thead style={{ background: '#f8fafc' }}>
                  <Table.Tr>
                    <Table.Th>Company / Manufacturer</Table.Th>
                    <Table.Th>Country of Origin</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th ta="right">Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {mfrLoading ? (
                    <Table.Tr><Table.Td colSpan={4} ta="center" py="xl" c="dimmed">Loading manufacturers...</Table.Td></Table.Tr>
                  ) : (mfrData?.data ?? []).length === 0 ? (
                    <Table.Tr><Table.Td colSpan={4} ta="center" py="xl" c="dimmed">No manufacturers registered yet.</Table.Td></Table.Tr>
                  ) : (
                    mfrData?.data.map((mfr) => (
                      <Table.Tr key={mfr.id}>
                        <Table.Td>
                          <Text size="sm" fw={700} c="#0f172a">{mfr.name}</Text>
                        </Table.Td>
                        <Table.Td>{mfr.country || 'Global / Unspecified'}</Table.Td>
                        <Table.Td>
                          <Badge color={mfr.is_active ? 'teal' : 'gray'} variant="light">
                            {mfr.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </Table.Td>
                        <Table.Td ta="right">
                          <Group gap="xs" justify="flex-end">
                            <ActionIcon variant="subtle" color="teal" onClick={() => handleOpenEditMfr(mfr)}>
                              <IconEdit size={16} />
                            </ActionIcon>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))
                  )}
                </Table.Tbody>
              </Table>
            </Paper>
          </Tabs.Panel>

          {/* TAB 4: UNITS OF MEASUREMENT */}
          <Tabs.Panel value="uom">
            <Paper p="md" radius="md" withBorder style={{ background: '#ffffff', borderColor: '#e2ece9' }}>
              <Table striped highlightOnHover withTableBorder>
                <Table.Thead style={{ background: '#f8fafc' }}>
                  <Table.Tr>
                    <Table.Th>Unit Name</Table.Th>
                    <Table.Th>Code Symbol</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th ta="right">Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {uomLoading ? (
                    <Table.Tr><Table.Td colSpan={4} ta="center" py="xl" c="dimmed">Loading units...</Table.Td></Table.Tr>
                  ) : (uomData?.data ?? []).length === 0 ? (
                    <Table.Tr><Table.Td colSpan={4} ta="center" py="xl" c="dimmed">No units registered yet.</Table.Td></Table.Tr>
                  ) : (
                    uomData?.data.map((uom) => (
                      <Table.Tr key={uom.id}>
                        <Table.Td>
                          <Text size="sm" fw={700} c="#0f172a">{uom.name}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge color="cyan" variant="outline">{uom.code}</Badge>
                        </Table.Td>
                        <Table.Td>
                          <Badge color={uom.is_active ? 'teal' : 'gray'} variant="light">
                            {uom.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </Table.Td>
                        <Table.Td ta="right">
                          <Group gap="xs" justify="flex-end">
                            <ActionIcon variant="subtle" color="teal" onClick={() => handleOpenEditUom(uom)}>
                              <IconEdit size={16} />
                            </ActionIcon>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))
                  )}
                </Table.Tbody>
              </Table>
            </Paper>
          </Tabs.Panel>
        </Tabs>

        {/* MODAL 1: ADD/EDIT SUPPLIER */}
        <Modal
          opened={supplierModalOpened}
          onClose={closeSupplierModal}
          title={<Text fw={750}>{editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}</Text>}
          centered
          size="md"
        >
          <form onSubmit={(e) => { e.preventDefault(); saveSupplierMutation.mutate(); }}>
            <Stack gap="sm">
              <TextInput label="Supplier / Company Name" placeholder="e.g. Searle Distributors" required value={supplierName} onChange={(e) => setSupplierName(e.currentTarget.value)} />
              <Grid gutter="xs">
                <Grid.Col span={6}>
                  <TextInput label="Contact Person" placeholder="e.g. Muhammad Bilal" value={supplierContact} onChange={(e) => setSupplierContact(e.currentTarget.value)} />
                </Grid.Col>
                <Grid.Col span={6}>
                  <TextInput label="Phone Number" placeholder="e.g. +92 300 1234567" value={supplierPhone} onChange={(e) => setSupplierPhone(e.currentTarget.value)} />
                </Grid.Col>
              </Grid>
              <Grid gutter="xs">
                <Grid.Col span={6}>
                  <TextInput label="Email" placeholder="e.g. sales@distributor.com" type="email" value={supplierEmail} onChange={(e) => setSupplierEmail(e.currentTarget.value)} />
                </Grid.Col>
                <Grid.Col span={6}>
                  <TextInput label="Tax / NTN Number" placeholder="e.g. 1234567-8" value={supplierTax} onChange={(e) => setSupplierTax(e.currentTarget.value)} />
                </Grid.Col>
              </Grid>
              <TextInput label="Physical Address" placeholder="City, Warehouse address" value={supplierAddress} onChange={(e) => setSupplierAddress(e.currentTarget.value)} />
              <NumberInput label="Payment Terms (Days)" placeholder="30" min={0} value={supplierPaymentTerms} onChange={(v) => setSupplierPaymentTerms(typeof v === 'number' ? v : 30)} />
              <Switch label="Active Supplier" checked={supplierActive} onChange={(e) => setSupplierActive(e.currentTarget.checked)} />
              <Group justify="flex-end" mt="md">
                <Button variant="default" onClick={closeSupplierModal}>Cancel</Button>
                <Button color="teal" type="submit" loading={saveSupplierMutation.isPending} disabled={!supplierName.trim()}>Save Supplier</Button>
              </Group>
            </Stack>
          </form>
        </Modal>

        {/* MODAL 2: ADD/EDIT CUSTOMER */}
        <Modal
          opened={customerModalOpened}
          onClose={closeCustomerModal}
          title={<Text fw={750}>{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</Text>}
          centered
          size="md"
        >
          <form onSubmit={(e) => { e.preventDefault(); saveCustomerMutation.mutate(); }}>
            <Stack gap="sm">
              <TextInput label="Customer Name" placeholder="e.g. Dr. Salman Khan" required value={customerName} onChange={(e) => setCustomerName(e.currentTarget.value)} />
              <Grid gutter="xs">
                <Grid.Col span={6}>
                  <TextInput label="Phone Number" placeholder="e.g. 0300 9876543" value={customerPhone} onChange={(e) => setCustomerPhone(e.currentTarget.value)} />
                </Grid.Col>
                <Grid.Col span={6}>
                  <TextInput label="Email Address" placeholder="e.g. salman@gmail.com" type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.currentTarget.value)} />
                </Grid.Col>
              </Grid>
              <TextInput label="Physical Address" placeholder="Delivery / Patient address" value={customerAddress} onChange={(e) => setCustomerAddress(e.currentTarget.value)} />
              <Grid gutter="xs">
                <Grid.Col span={6}>
                  <TextInput label="Loyalty / Patient Card #" placeholder="e.g. CARD-901" value={customerLoyalty} onChange={(e) => setCustomerLoyalty(e.currentTarget.value)} />
                </Grid.Col>
                <Grid.Col span={6}>
                  <NumberInput label={`Credit Limit (${currency})`} placeholder="0" min={0} value={customerCreditLimit} onChange={(v) => setCustomerCreditLimit(typeof v === 'number' ? v : 0)} />
                </Grid.Col>
              </Grid>
              <Switch label="Active Customer" checked={customerActive} onChange={(e) => setCustomerActive(e.currentTarget.checked)} />
              <Group justify="flex-end" mt="md">
                <Button variant="default" onClick={closeCustomerModal}>Cancel</Button>
                <Button color="teal" type="submit" loading={saveCustomerMutation.isPending} disabled={!customerName.trim()}>Save Customer</Button>
              </Group>
            </Stack>
          </form>
        </Modal>

        {/* MODAL 3: ADD/EDIT MANUFACTURER */}
        <Modal
          opened={mfrModalOpened}
          onClose={closeMfrModal}
          title={<Text fw={750}>{editingMfr ? 'Edit Manufacturer' : 'Add New Manufacturer'}</Text>}
          centered
          size="sm"
        >
          <form onSubmit={(e) => { e.preventDefault(); saveMfrMutation.mutate(); }}>
            <Stack gap="sm">
              <TextInput label="Manufacturer Name" placeholder="e.g. GSK, Abbott, Getz Pharma" required value={mfrName} onChange={(e) => setMfrName(e.currentTarget.value)} />
              <TextInput label="Country of Origin" placeholder="e.g. Pakistan, Switzerland, USA" value={mfrCountry} onChange={(e) => setMfrCountry(e.currentTarget.value)} />
              <Switch label="Active Manufacturer" checked={mfrActive} onChange={(e) => setMfrActive(e.currentTarget.checked)} />
              <Group justify="flex-end" mt="md">
                <Button variant="default" onClick={closeMfrModal}>Cancel</Button>
                <Button color="teal" type="submit" loading={saveMfrMutation.isPending} disabled={!mfrName.trim()}>Save Manufacturer</Button>
              </Group>
            </Stack>
          </form>
        </Modal>

        {/* MODAL 4: ADD/EDIT UOM */}
        <Modal
          opened={uomModalOpened}
          onClose={closeUomModal}
          title={<Text fw={750}>{editingUom ? 'Edit Measurement Unit' : 'Add Measurement Unit'}</Text>}
          centered
          size="sm"
        >
          <form onSubmit={(e) => { e.preventDefault(); saveUomMutation.mutate(); }}>
            <Stack gap="sm">
              <TextInput label="Unit Name" placeholder="e.g. Tablet, Strip, Bottle, Box" required value={uomName} onChange={(e) => setUomName(e.currentTarget.value)} />
              <TextInput label="Unit Code Symbol" placeholder="e.g. TAB, STRIP, BTL, BOX" required value={uomCode} onChange={(e) => setUomCode(e.currentTarget.value)} />
              <Switch label="Active Unit" checked={uomActive} onChange={(e) => setUomActive(e.currentTarget.checked)} />
              <Group justify="flex-end" mt="md">
                <Button variant="default" onClick={closeUomModal}>Cancel</Button>
                <Button color="teal" type="submit" loading={saveUomMutation.isPending} disabled={!uomName.trim() || !uomCode.trim()}>Save Unit</Button>
              </Group>
            </Stack>
          </form>
        </Modal>
      </main>
    </AppShell>
  );
}
