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
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { useDebouncedValue, useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconEdit, IconPlus, IconSearch, IconTrash } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DataTable } from 'mantine-datatable';
import { AppShell } from '@/components/app-shell';
import {
  Medicine,
  createMedicine,
  deleteMedicine,
  getMedicineCategories,
  getMedicines,
  updateMedicine,
} from '@/features/catalog/api';
import { useAuthStore } from '@/stores/auth-store';

const DOSAGE_FORMS = [
  'Tablet',
  'Capsule',
  'Syrup',
  'Suspension',
  'Injection',
  'Ointment',
  'Cream',
  'Gel',
  'Drops',
  'Inhaler',
  'Suppository',
  'Powder',
  'Sachet',
];

const PACKAGING_TYPES = [
  { value: 'blister', label: 'Blister Pack / Strip (Divisible into loose tablets)' },
  { value: 'bottle', label: 'Bottle / Syrup / Drops (Non-divisible package)' },
  { value: 'tube', label: 'Tube / Cream / Ointment (Non-divisible package)' },
  { value: 'vial', label: 'Vial / Ampoule / Injection (Non-divisible package)' },
  { value: 'inhaler', label: 'Inhaler / Spray (Non-divisible package)' },
  { value: 'sachet', label: 'Sachet / Powder (Non-divisible package)' },
  { value: 'box', label: 'Box / Pack / Kit (Non-divisible package)' },
];

export default function MedicinesPage() {
  const token = useAuthStore((state) => state.accessToken);
  const currentTenantId = useAuthStore((state) => state.tenantId);
  const tenants = useAuthStore((state) => state.tenants);
  const currentTenant = tenants.find((t) => t.id === currentTenantId);
  const currency = currentTenant?.currency_code ?? 'PKR';
  const isPakistan = Boolean(
    currentTenant?.country_code === 'PK' ||
    currentTenant?.country?.toLowerCase().includes('pakistan') ||
    currency === 'PKR'
  );

  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 250);

  // Modal states
  const [opened, { open, close }] = useDisclosure(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [genericName, setGenericName] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [strength, setStrength] = useState('');
  const [dosageForm, setDosageForm] = useState<string | null>('Tablet');
  const [packagingType, setPackagingType] = useState<string>('blister');
  const [isDivisible, setIsDivisible] = useState<boolean>(true);
  const [packageLabel, setPackageLabel] = useState<string>('Strip');
  const [reorderLevel, setReorderLevel] = useState<number>(10);
  const [costPrice, setCostPrice] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [tabletsPerStrip, setTabletsPerStrip] = useState<number>(10);
  const [stripsPerBox, setStripsPerBox] = useState<number>(10);
  const [pricePerStrip, setPricePerStrip] = useState<number>(0);
  const [pricePerUnit, setPricePerUnit] = useState<number>(0);
  const [pricePerBox, setPricePerBox] = useState<number>(0);
  const [initialStock, setInitialStock] = useState<number>(0);
  const [isActive, setIsActive] = useState(true);

  // Queries
  const { data: medicinesData, isPending, error } = useQuery({
    queryKey: ['medicines', debouncedSearch],
    queryFn: () => getMedicines(debouncedSearch),
    enabled: Boolean(token),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['medicine-categories'],
    queryFn: getMedicineCategories,
    enabled: Boolean(token),
  });

  const categoryOptions = (categoriesData?.data ?? []).map((cat) => ({
    value: String(cat.id),
    label: cat.name,
  }));

  const handleDosageFormChange = (newForm: string | null) => {
    setDosageForm(newForm);
    if (!newForm) return;
    const formLower = newForm.toLowerCase();
    if (
      formLower.includes('syrup') ||
      formLower.includes('suspension') ||
      formLower.includes('drop') ||
      formLower.includes('solution')
    ) {
      setPackagingType('bottle');
      setIsDivisible(false);
      setPackageLabel('Bottle');
    } else if (formLower.includes('cream') || formLower.includes('ointment') || formLower.includes('gel')) {
      setPackagingType('tube');
      setIsDivisible(false);
      setPackageLabel('Tube');
    } else if (formLower.includes('injection') || formLower.includes('vial') || formLower.includes('ampoule')) {
      setPackagingType('vial');
      setIsDivisible(false);
      setPackageLabel('Vial');
    } else if (formLower.includes('inhaler') || formLower.includes('spray')) {
      setPackagingType('inhaler');
      setIsDivisible(false);
      setPackageLabel('Inhaler');
    } else if (formLower.includes('sachet') || formLower.includes('powder')) {
      setPackagingType('sachet');
      setIsDivisible(false);
      setPackageLabel('Sachet');
    } else if (formLower.includes('tablet') || formLower.includes('capsule')) {
      setPackagingType('blister');
      setIsDivisible(true);
      setPackageLabel(isPakistan ? 'Patta' : 'Strip');
    }
  };

  const handleOpenCreate = () => {
    setEditingMedicine(null);
    setName('');
    setGenericName('');
    setCategoryId(categoryOptions[0]?.value ?? null);
    setSku('');
    setBarcode('');
    setStrength('');
    setDosageForm('Tablet');
    setPackagingType('blister');
    setIsDivisible(true);
    setPackageLabel('Strip');
    setReorderLevel(10);
    setCostPrice(0);
    setSellingPrice(0);
    setTabletsPerStrip(10);
    setStripsPerBox(10);
    setPricePerStrip(0);
    setPricePerUnit(0);
    setPricePerBox(0);
    setInitialStock(0);
    setIsActive(true);
    open();
  };

  const handleOpenEdit = (med: Medicine) => {
    setEditingMedicine(med);
    setName(med.name);
    setGenericName(med.generic_name ?? '');
    setCategoryId(med.category?.id ? String(med.category.id) : null);
    setSku(med.sku);
    setBarcode(med.barcode ?? '');
    setStrength(med.strength ?? '');
    setDosageForm(med.dosage_form ?? 'Tablet');
    setPackagingType(med.packaging_type ?? 'blister');
    setIsDivisible(med.is_divisible ?? true);
    setPackageLabel(med.package_label ?? (med.packaging_type === 'bottle' ? 'Bottle' : 'Strip'));
    setReorderLevel(parseFloat(med.reorder_level) || 10);
    setCostPrice(parseFloat(med.cost_price) || 0);
    setSellingPrice(parseFloat(med.selling_price) || 0);
    setTabletsPerStrip(med.tablets_per_strip || 10);
    setStripsPerBox(med.strips_per_box || 10);
    setPricePerStrip(parseFloat(med.price_per_strip || med.selling_price) || 0);
    setPricePerUnit(parseFloat(med.price_per_unit || '0') || 0);
    setPricePerBox(parseFloat(med.price_per_box || '0') || 0);
    setInitialStock(0);
    setIsActive(med.is_active);
    open();
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: name.trim(),
        generic_name: genericName.trim() || undefined,
        medicine_category_id: categoryId ? parseInt(categoryId, 10) : undefined,
        sku: sku.trim(),
        barcode: barcode.trim() || undefined,
        strength: strength.trim() || undefined,
        dosage_form: dosageForm || undefined,
        packaging_type: packagingType,
        is_divisible: isDivisible,
        package_label: packageLabel.trim() || undefined,
        reorder_level: Number(reorderLevel),
        cost_price: Number(costPrice),
        selling_price: Number(sellingPrice),
        tablets_per_strip: Number(tabletsPerStrip) || 10,
        strips_per_box: Number(stripsPerBox) || 10,
        price_per_strip: Number(pricePerStrip || sellingPrice),
        price_per_unit: Number(pricePerUnit || Math.round((sellingPrice / (tabletsPerStrip || 10)) * 100) / 100),
        price_per_box: Number(pricePerBox || Math.round((sellingPrice * (stripsPerBox || 10)) * 100) / 100),
        initial_stock: !editingMedicine && initialStock > 0 ? Number(initialStock) : undefined,
        is_active: isActive,
      };

      if (editingMedicine) {
        return updateMedicine(editingMedicine.id, payload);
      }
      return createMedicine(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
      queryClient.invalidateQueries({ queryKey: ['pos-products'] });
      notifications.show({
        title: editingMedicine ? 'Medicine updated' : 'Medicine created',
        message: `"${name}" has been saved successfully.`,
        color: 'teal',
        icon: <IconCheck size={16} />,
      });
      close();
    },
    onError: (err: Error) => {
      notifications.show({
        title: 'Error saving medicine',
        message: err.message,
        color: 'red',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteMedicine(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
      queryClient.invalidateQueries({ queryKey: ['pos-products'] });
      notifications.show({
        title: 'Medicine deactivated',
        message: 'The medicine status has been updated to inactive.',
        color: 'teal',
        icon: <IconCheck size={16} />,
      });
    },
    onError: (err: Error) => {
      notifications.show({
        title: 'Failed to deactivate medicine',
        message: err.message,
        color: 'red',
      });
    },
  });

  return (
    <AppShell>
      <main className="content">
        <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
          <div>
            <div className="eyebrow">Foundation · Catalog</div>
            <h1 className="page-title">Medicine master</h1>
            <p className="page-subtitle">A tenant-scoped list of products configured for your pharmacy.</p>
          </div>
          <Button leftSection={<IconPlus size={16} />} onClick={handleOpenCreate}>
            Add medicine
          </Button>
        </Group>

        {!token && (
          <Alert color="orange" mt="xl" title="Sign in to view your catalog">
            Your medicines are available after you sign in to a pharmacy workspace.
          </Alert>
        )}
        {error && (
          <Alert color="red" mt="xl" title="Could not load medicines">
            {error.message}
          </Alert>
        )}

        <section className="panel" style={{ marginTop: 24 }}>
          <Group justify="space-between" mb="md" wrap="wrap">
            <div>
              <Text fw={700} size="sm">Medicines</Text>
              <Text c="dimmed" size="xs" mt={3}>{medicinesData?.meta.total ?? 0} products</Text>
            </div>
            <TextInput
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              placeholder="Search name, generic, SKU, barcode..."
              leftSection={<IconSearch size={16} />}
              w={300}
            />
          </Group>

          <DataTable
            withTableBorder
            borderRadius="md"
            minHeight={160}
            fetching={isPending && Boolean(token)}
            records={medicinesData?.data ?? []}
            columns={[
              {
                accessor: 'name',
                title: 'Medicine',
                render: ({ name, generic_name }) => (
                  <div>
                    <Text size="sm" fw={600}>{name}</Text>
                    <Text size="xs" c="dimmed">{generic_name || 'Generic not set'}</Text>
                  </div>
                ),
              },
              { accessor: 'sku', title: 'SKU' },
              {
                accessor: 'strength',
                title: 'Strength / Form',
                render: ({ strength, dosage_form }) => (
                  <Text size="sm">
                    {strength || '—'} {dosage_form ? `(${dosage_form})` : ''}
                  </Text>
                ),
              },
              {
                accessor: 'category.name',
                title: 'Category',
                render: ({ category }) => (
                  <Badge color="cyan" variant="dot">
                    {category?.name ?? 'Uncategorized'}
                  </Badge>
                ),
              },
              {
                accessor: 'selling_price',
                title: 'Selling Price (MRP)',
                textAlign: 'right',
                render: ({ selling_price }) => (
                  <Text size="sm" fw={700} c="teal">
                    {currency} {parseFloat(selling_price || '0').toFixed(2)}
                  </Text>
                ),
              },
              {
                accessor: 'packaging',
                title: isPakistan ? 'Dispensing Rates (Patta / Goli / Dabba)' : 'Packaging Rates (Unit / Box)',
                render: (med) => {
                  const isDiv = med.is_divisible !== false && (med.packaging_type === 'blister' || !med.packaging_type);
                  if (!isDiv) {
                    const label = med.package_label || (med.packaging_type ? med.packaging_type.toUpperCase() : 'BOTTLE');
                    return (
                      <Badge size="xs" variant="filled" color="cyan">
                        {label} @ {currency} {parseFloat(med.selling_price || '0').toFixed(0)} (Sealed Package)
                      </Badge>
                    );
                  }

                  const stripPrice = parseFloat(med.price_per_strip || med.selling_price || '0');
                  const tabs = med.tablets_per_strip || 10;
                  const goliPrice = parseFloat(med.price_per_unit || '0') || (stripPrice / tabs);
                  const boxes = med.strips_per_box || 10;
                  const boxPrice = parseFloat(med.price_per_box || '0') || (stripPrice * boxes);

                  return (
                    <Group gap={4} wrap="nowrap">
                      <Badge size="xs" variant="light" color="teal">
                        {isPakistan ? 'Patta' : 'Unit'}: {currency} {stripPrice.toFixed(0)}
                      </Badge>
                      {isPakistan && (
                        <Badge size="xs" variant="light" color="blue">
                          Goli: {currency} {goliPrice.toFixed(1)}
                        </Badge>
                      )}
                      <Badge size="xs" variant="light" color="indigo">
                        {isPakistan ? 'Dabba' : 'Box'}: {currency} {boxPrice.toFixed(0)}
                      </Badge>
                    </Group>
                  );
                },
              },
              {
                accessor: 'cost_price',
                title: 'Cost Price',
                textAlign: 'right',
                render: ({ cost_price }) => (
                  <Text size="sm" c="dimmed">
                    {currency} {parseFloat(cost_price || '0').toFixed(2)}
                  </Text>
                ),
              },
              {
                accessor: 'reorder_level',
                title: 'Reorder At',
                textAlign: 'right',
                render: ({ reorder_level }) => Math.round(parseFloat(reorder_level) || 0),
              },
              {
                accessor: 'is_active',
                title: 'Status',
                render: ({ is_active }) => (
                  <Badge color={is_active ? 'teal' : 'gray'} variant="light">
                    {is_active ? 'Active' : 'Inactive'}
                  </Badge>
                ),
              },
              {
                accessor: 'actions',
                title: '',
                textAlign: 'right',
                render: (med) => (
                  <Group gap="xs" justify="flex-end">
                    <Tooltip label="Edit medicine">
                      <ActionIcon variant="subtle" color="teal" size="sm" onClick={() => handleOpenEdit(med)}>
                        <IconEdit size={16} />
                      </ActionIcon>
                    </Tooltip>
                    {med.is_active && (
                      <Tooltip label="Deactivate medicine">
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          size="sm"
                          onClick={() => {
                            if (window.confirm(`Deactivate product "${med.name}"?`)) {
                              deleteMutation.mutate(med.id);
                            }
                          }}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </Group>
                ),
              },
            ]}
            noRecordsText={token ? 'No medicines found in this workspace.' : 'Sign in to load medicines.'}
          />
        </section>

        {/* Modal: Create / Edit Medicine */}
        <Modal
          opened={opened}
          onClose={close}
          title={<Text fw={700}>{editingMedicine ? 'Edit medicine' : 'Add new medicine'}</Text>}
          size="lg"
          centered
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate();
            }}
          >
            <Stack gap="sm">
              <Grid>
                <Grid.Col span={6}>
                  <TextInput
                    label="Brand Name"
                    placeholder="e.g. Arinac Forte"
                    required
                    value={name}
                    onChange={(e) => setName(e.currentTarget.value)}
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <TextInput
                    label="Generic Name"
                    placeholder="e.g. Ibuprofen + Pseudoephedrine"
                    value={genericName}
                    onChange={(e) => setGenericName(e.currentTarget.value)}
                  />
                </Grid.Col>
              </Grid>

              <Grid>
                <Grid.Col span={6}>
                  <Select
                    label="Category"
                    placeholder="Select category"
                    data={categoryOptions}
                    value={categoryId}
                    onChange={setCategoryId}
                    clearable
                    searchable
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <Select
                    label="Dosage Form"
                    placeholder="Select dosage form"
                    data={DOSAGE_FORMS}
                    value={dosageForm}
                    onChange={handleDosageFormChange}
                    searchable
                  />
                </Grid.Col>
              </Grid>

              <Grid>
                <Grid.Col span={6}>
                  <Select
                    label="Packaging & Dispensing Form"
                    description={isDivisible ? 'Divisible into sub-units (e.g. loose tablets)' : 'Sold as sealed, non-divisible whole unit'}
                    data={PACKAGING_TYPES}
                    value={packagingType}
                    onChange={(val) => {
                      const pType = val || 'blister';
                      setPackagingType(pType);
                      const isDiv = pType === 'blister';
                      setIsDivisible(isDiv);
                      if (pType === 'bottle') setPackageLabel('Bottle');
                      else if (pType === 'tube') setPackageLabel('Tube');
                      else if (pType === 'vial') setPackageLabel('Vial');
                      else if (pType === 'inhaler') setPackageLabel('Inhaler');
                      else if (pType === 'sachet') setPackageLabel('Sachet');
                      else if (pType === 'box') setPackageLabel('Box');
                      else setPackageLabel(isPakistan ? 'Patta' : 'Strip');
                    }}
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <TextInput
                    label="Package Unit Label"
                    placeholder="e.g. Bottle, Tube, Vial, Strip"
                    description="Label displayed on POS counter"
                    value={packageLabel}
                    onChange={(e) => setPackageLabel(e.currentTarget.value)}
                  />
                </Grid.Col>
              </Grid>

              <Grid>
                <Grid.Col span={6}>
                  <TextInput
                    label="SKU"
                    placeholder="e.g. ARINAC-F-200"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.currentTarget.value)}
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <TextInput
                    label="Barcode / UPC"
                    placeholder="e.g. 2978038"
                    value={barcode}
                    onChange={(e) => setBarcode(e.currentTarget.value)}
                  />
                </Grid.Col>
              </Grid>

              <Grid>
                <Grid.Col span={6}>
                  <TextInput
                    label="Strength"
                    placeholder="e.g. 500mg, 10ml, 5%"
                    value={strength}
                    onChange={(e) => setStrength(e.currentTarget.value)}
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <NumberInput
                    label="Reorder Alert Level"
                    placeholder="Threshold for reordering"
                    min={0}
                    value={reorderLevel}
                    onChange={(val) => setReorderLevel(typeof val === 'number' ? val : 0)}
                  />
                </Grid.Col>
              </Grid>

              <Grid>
                <Grid.Col span={6}>
                  <NumberInput
                    label={`Selling Price (MRP) in ${currency}`}
                    placeholder="Price charged to customer"
                    required
                    min={0}
                    decimalScale={2}
                    value={sellingPrice}
                    onChange={(val) => setSellingPrice(typeof val === 'number' ? val : 0)}
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <NumberInput
                    label={`Cost Price in ${currency}`}
                    placeholder="Purchase / supplier price"
                    min={0}
                    decimalScale={2}
                    value={costPrice}
                    onChange={(val) => setCostPrice(typeof val === 'number' ? val : 0)}
                  />
                </Grid.Col>
              </Grid>

              {isDivisible ? (
                <Paper p="sm" radius="md" withBorder style={{ background: '#f8fafc', borderColor: '#e2ece9' }}>
                  <Text size="xs" fw={700} c="#0f766e" tt="uppercase" mb="xs">
                    {isPakistan ? 'Pakistani Dispensing Packaging (Patta / Goli / Dabba)' : 'Packaging & Unit Breakdown (Strip / Box)'}
                  </Text>
                  <Grid gutter="xs">
                    <Grid.Col span={6}>
                      <NumberInput
                        size="xs"
                        label={isPakistan ? 'Tablets per Patta (Strip)' : 'Units / Tablets per Strip'}
                        placeholder="10"
                        min={1}
                        value={tabletsPerStrip}
                        onChange={(val) => {
                          const tabs = typeof val === 'number' && val > 0 ? val : 10;
                          setTabletsPerStrip(tabs);
                          if (sellingPrice > 0) {
                            setPricePerUnit(Math.round((sellingPrice / tabs) * 100) / 100);
                          }
                        }}
                      />
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <NumberInput
                        size="xs"
                        label={isPakistan ? 'Pattay per Dabba (Box)' : 'Strips per Pack / Box'}
                        placeholder="10"
                        min={1}
                        value={stripsPerBox}
                        onChange={(val) => {
                          const boxes = typeof val === 'number' && val > 0 ? val : 10;
                          setStripsPerBox(boxes);
                          if (sellingPrice > 0) {
                            setPricePerBox(Math.round(sellingPrice * boxes * 100) / 100);
                          }
                        }}
                      />
                    </Grid.Col>
                  </Grid>
                  <Grid gutter="xs" mt="xs">
                    <Grid.Col span={isPakistan ? 4 : 6}>
                      <NumberInput
                        size="xs"
                        label={isPakistan ? `Price / Patta (${currency})` : `Price / Unit / Strip (${currency})`}
                        placeholder={String(sellingPrice)}
                        min={0}
                        decimalScale={2}
                        value={pricePerStrip || sellingPrice}
                        onChange={(val) => setPricePerStrip(typeof val === 'number' ? val : 0)}
                      />
                    </Grid.Col>
                    {isPakistan && (
                      <Grid.Col span={4}>
                        <NumberInput
                          size="xs"
                          label={`Price / Goli Loose (${currency})`}
                          placeholder={String(Math.round((sellingPrice / (tabletsPerStrip || 10)) * 100) / 100)}
                          min={0}
                          decimalScale={2}
                          value={pricePerUnit}
                          onChange={(val) => setPricePerUnit(typeof val === 'number' ? val : 0)}
                        />
                      </Grid.Col>
                    )}
                    <Grid.Col span={isPakistan ? 4 : 6}>
                      <NumberInput
                        size="xs"
                        label={isPakistan ? `Price / Dabba (${currency})` : `Price / Pack / Box (${currency})`}
                        placeholder={String(Math.round(sellingPrice * (stripsPerBox || 10) * 100) / 100)}
                        min={0}
                        decimalScale={2}
                        value={pricePerBox}
                        onChange={(val) => setPricePerBox(typeof val === 'number' ? val : 0)}
                      />
                    </Grid.Col>
                  </Grid>
                </Paper>
              ) : (
                <Paper p="sm" radius="md" withBorder style={{ background: '#f0fdfa', borderColor: '#ccfbf1' }}>
                  <Group justify="space-between" align="center">
                    <div>
                      <Text size="xs" fw={700} c="#0f766e" tt="uppercase">
                        Sealed Unit Dispensing ({packageLabel || 'Bottle'})
                      </Text>
                      <Text size="xs" c="#134e4a">
                        This product is sold as a sealed whole package. POS will automatically hide loose tablet buttons.
                      </Text>
                    </div>
                    <Badge color="teal" variant="light" size="lg">
                      {currency} {sellingPrice.toFixed(2)} / {packageLabel || 'Bottle'}
                    </Badge>
                  </Group>
                </Paper>
              )}

              {!editingMedicine && (
                <NumberInput
                  label="Initial Stock Quantity (Optional)"
                  description="Automatically provisions an opening stock batch so this product can be sold at the POS immediately."
                  placeholder="e.g. 50"
                  min={0}
                  value={initialStock}
                  onChange={(val) => setInitialStock(typeof val === 'number' ? val : 0)}
                />
              )}

              <Switch
                label="Active Product"
                checked={isActive}
                onChange={(e) => setIsActive(e.currentTarget.checked)}
                mt="xs"
              />

              <Group justify="flex-end" mt="md">
                <Button variant="default" onClick={close}>Cancel</Button>
                <Button type="submit" loading={saveMutation.isPending} disabled={!name.trim() || !sku.trim()}>
                  {editingMedicine ? 'Save changes' : 'Create medicine'}
                </Button>
              </Group>
            </Stack>
          </form>
        </Modal>
      </main>
    </AppShell>
  );
}
