'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Center,
  Divider,
  Grid,
  Group,
  Kbd,
  Modal,
  NumberInput,
  Paper,
  ScrollArea,
  SegmentedControl,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import { useDebouncedValue, useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconArrowLeft,
  IconCheck,
  IconClock,
  IconCut,
  IconKeyboard,
  IconLayoutGrid,
  IconList,
  IconMinus,
  IconPackage,
  IconPill,
  IconPlus,
  IconPrinter,
  IconReceipt,
  IconRefresh,
  IconSearch,
  IconShoppingCart,
  IconTrash,
} from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DataTable } from 'mantine-datatable';
import { AppShell } from '@/components/app-shell';
import {
  CartItem,
  PosProduct,
  SaleRecord,
  checkout,
  getPosProducts,
  getSales,
} from '@/features/sales/api';
import { useAuthStore } from '@/stores/auth-store';

export default function SalesPosPage() {
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const isOwnerOrAdmin = Boolean(user?.roles?.includes('owner') || user?.roles?.includes('admin'));
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
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<string | null>('pos');
  const [viewMode, setViewMode] = useState<'grid' | 'dense'>('grid');

  // Search & category filter states
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 150);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mobile_money' | 'credit'>('cash');

  // Success Modal & Receipt Modal states
  const [successModalOpened, { open: openSuccessModal, close: closeSuccessModal }] = useDisclosure(false);
  const [receiptModalOpened, { open: openReceipt, close: closeReceipt }] = useDisclosure(false);
  const [shortcutsModalOpened, { open: openShortcutsModal, close: closeShortcutsModal }] = useDisclosure(false);
  const [completedSale, setCompletedSale] = useState<SaleRecord | null>(null);
  const tenderInputRef = useRef<HTMLInputElement>(null);

  // Queries
  const { data: productsData, isPending: productsLoading, error: productsError, refetch: refetchProducts } = useQuery({
    queryKey: ['pos-products', debouncedSearch],
    queryFn: () => getPosProducts(debouncedSearch),
    enabled: Boolean(token),
  });

  const { data: salesHistoryData, isPending: salesLoading } = useQuery({
    queryKey: ['sales-history'],
    queryFn: () => getSales(),
    enabled: Boolean(token) && activeTab === 'history',
  });

  const products = useMemo(() => {
    return productsData?.data ?? [];
  }, [productsData]);

  // Helper to calculate price per unit type
  const getProductPriceForUnit = (product: PosProduct, unit: string): number => {
    const isDivisible = product.is_divisible !== false && (product.packaging_type === 'blister' || !product.packaging_type);
    if (!isDivisible) {
      return parseFloat(product.selling_price) || 0;
    }

    const stripPrice = parseFloat(product.price_per_strip) || parseFloat(product.selling_price) || 0;
    const tabsPerStrip = Math.max(1, product.tablets_per_strip || 10);
    const stripsPerBox = Math.max(1, product.strips_per_box || 10);

    if (unit === 'unit') {
      const unitPrice = parseFloat(product.price_per_unit);
      return unitPrice > 0 ? unitPrice : Math.round((stripPrice / tabsPerStrip) * 100) / 100;
    }
    if (unit === 'box') {
      const boxPrice = parseFloat(product.price_per_box);
      return boxPrice > 0 ? boxPrice : Math.round(stripPrice * stripsPerBox * 100) / 100;
    }
    return stripPrice;
  };

  // Cart calculations
  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
  }, [cart]);

  const totalPayable = Math.max(0, subtotal - (discountAmount || 0) + (taxAmount || 0));
  const changeDue = Math.max(0, (paidAmount || 0) - totalPayable);

  // Cart actions
  const addToCart = (product: PosProduct, unitType: string = 'strip', qty = 1) => {
    const availableStock = parseFloat(product.total_stock) || 0;
    if (!product.in_stock || availableStock <= 0) {
      notifications.show({
        title: 'Out of Stock',
        message: `${product.name} currently has 0 active stock in dispensary.`,
        color: 'red',
      });
      return;
    }

    const isDivisible = product.is_divisible !== false && (product.packaging_type === 'blister' || !product.packaging_type);
    const effectiveUnitType = isDivisible ? unitType : (product.packaging_type || 'bottle');
    const price = getProductPriceForUnit(product, effectiveUnitType);

    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.medicine.id === product.id && item.unitType === effectiveUnitType
      );

      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + qty,
        };
        return updated;
      }

      return [
        ...prev,
        {
          medicine: product,
          quantity: qty,
          unitType: effectiveUnitType,
          unitPrice: price,
          discount: 0,
        },
      ];
    });

    const unitLabel = !isDivisible
      ? (product.package_label || (product.packaging_type ? product.packaging_type.toUpperCase() : 'Bottle'))
      : effectiveUnitType === 'unit'
      ? 'Goli (Loose Tab)'
      : effectiveUnitType === 'box'
      ? 'Dabba (Box)'
      : 'Patta (Strip)';

    notifications.show({
      title: 'Added to Cart',
      message: `+${qty} ${unitLabel} of ${product.name}`,
      color: 'teal',
      autoClose: 1200,
    });
  };

  const updateQuantity = (medicineId: number, unitType: string, qty: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.medicine.id === medicineId && item.unitType === unitType) {
            const newQty = Math.max(1, qty);
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const updateUnitType = (medicineId: number, currentUnit: string, newUnit: string) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.medicine.id === medicineId && item.unitType === currentUnit) {
          const newPrice = getProductPriceForUnit(item.medicine, newUnit);
          return {
            ...item,
            unitType: newUnit,
            unitPrice: newPrice,
          };
        }
        return item;
      })
    );
  };

  const removeFromCart = (medicineId: number, unitType: string) => {
    setCart((prev) => prev.filter((item) => !(item.medicine.id === medicineId && item.unitType === unitType)));
  };

  const clearCart = () => {
    setCart([]);
    setDiscountAmount(0);
    setTaxAmount(0);
    setPaidAmount(0);
  };

  const startNewSale = () => {
    closeSuccessModal();
    closeReceipt();
    clearCart();
    setSearch('');
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  };

  // Checkout mutation
  const checkoutMutation = useMutation({
    mutationFn: () => {
      const effectivePaid = paidAmount >= totalPayable ? paidAmount : totalPayable;
      return checkout({
        payment_method: paymentMethod,
        discount_amount: discountAmount,
        tax_amount: taxAmount,
        paid_amount: effectivePaid,
        items: cart.map((item) => ({
          medicine_id: item.medicine.id,
          batch_id: item.medicine.default_batch_id,
          quantity: item.quantity,
          unit_type: item.unitType,
          unit_price: item.unitPrice,
          discount: item.discount,
        })),
      });
    },
    onSuccess: ({ data }) => {
      setCompletedSale(data);
      queryClient.invalidateQueries({ queryKey: ['pos-products'] });
      queryClient.invalidateQueries({ queryKey: ['sales-history'] });
      openSuccessModal();
    },
    onError: (err: Error) => {
      notifications.show({
        title: 'Checkout Failed',
        message: err.message,
        color: 'red',
      });
    },
  });

  // Global POS Keyboard Shortcuts (Zero-Mouse Mode)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (e.key === 'F2') {
        e.preventDefault();
        tenderInputRef.current?.focus();
        tenderInputRef.current?.select();
      } else if (e.key === 'F3') {
        e.preventDefault();
        setViewMode((prev) => (prev === 'dense' ? 'grid' : 'dense'));
      } else if (e.key === 'F4') {
        e.preventDefault();
        if (cart.length > 0 && !checkoutMutation.isPending) {
          checkoutMutation.mutate();
        }
      } else if (e.key === 'F9') {
        e.preventDefault();
        clearCart();
      } else if (e.key === 'F12' || (e.key === '?' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName))) {
        e.preventDefault();
        openShortcutsModal();
      } else if (e.key === 'Escape') {
        if (shortcutsModalOpened) {
          closeShortcutsModal();
        } else if (successModalOpened) {
          startNewSale();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, checkoutMutation, shortcutsModalOpened, successModalOpened]);

  return (
    <AppShell>
      <main className="content" style={{ maxWidth: '100%', padding: '18px 24px' }}>
        {/* Top Header */}
        <Group justify="space-between" align="center" mb="md">
          <div>
            <Group gap="xs" align="center">
              <div className="eyebrow">RETAIL PHARMACY OTC COUNTER</div>
              <Badge color="teal" variant="light" size="sm">
                FEFO Batch Auto-Selection
              </Badge>
            </Group>
            <h1 className="page-title" style={{ margin: '2px 0 0 0', fontSize: 26, fontWeight: 800 }}>
              POS Counter Terminal
            </h1>
            <Text size="xs" c="dimmed">
              {isPakistan
                ? <>Speedy Pakistani OTC dispensing: <b>Patta (Strip)</b>, <b>Goli (Loose Cut Tablet)</b>, and <b>Dabba (Box)</b></>
                : <>Retail Dispensary POS: Standard <b>Unit / Strip</b> and <b>Box / Pack</b> dispensing</>}
            </Text>
          </div>

          <Group gap="sm">
            {isOwnerOrAdmin && (
              <Button
                component={Link}
                href="/dashboard"
                variant="default"
                size="xs"
                leftSection={<IconArrowLeft size={14} />}
              >
                Exit to Dashboard
              </Button>
            )}
            <Button
              variant="light"
              color="teal"
              size="xs"
              leftSection={<IconKeyboard size={14} />}
              onClick={openShortcutsModal}
            >
              Shortcuts (F12)
            </Button>
            <SegmentedControl
              value={viewMode}
              onChange={(val) => setViewMode(val as 'grid' | 'dense')}
              data={[
                { label: <Group gap={4}><IconLayoutGrid size={14} /><Text size="xs">Grid</Text></Group>, value: 'grid' },
                { label: <Group gap={4}><IconList size={14} /><Text size="xs">Dense Table</Text></Group>, value: 'dense' },
              ]}
              size="xs"
              color="teal"
            />
            <Tabs value={activeTab} onChange={setActiveTab} variant="pills" color="teal">
              <Tabs.List>
                <Tabs.Tab value="pos" leftSection={<IconReceipt size={16} />}>
                  Counter POS
                </Tabs.Tab>
                <Tabs.Tab value="history" leftSection={<IconClock size={16} />}>
                  Sales History
                </Tabs.Tab>
              </Tabs.List>
            </Tabs>
          </Group>
        </Group>

        {activeTab === 'pos' && (
          <Grid gutter="md">
            {/* Left Column: Product Search & Dispensary Catalog */}
            <Grid.Col span={{ base: 12, md: 7, lg: 7.5 }}>
              <Paper
                p="md"
                radius="md"
                withBorder
                style={{
                  background: '#ffffff',
                  borderColor: '#e2ece9',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
                }}
              >
                {/* Search Bar with live feedback */}
                <Group justify="space-between" align="center" mb="md">
                  <TextInput
                    ref={searchInputRef}
                    placeholder="Type brand name (Arinac, Brufen, Panadol), generic, or scan barcode..."
                    leftSection={<IconSearch size={20} color="#0d9488" />}
                    value={search}
                    onChange={(e) => setSearch(e.currentTarget.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (products.length === 1) {
                          addToCart(products[0], 'strip', 1);
                          setSearch('');
                        } else if (products.length > 1) {
                          const exactMatch = products.find(
                            (p) =>
                              (p.barcode && p.barcode.toLowerCase() === search.trim().toLowerCase()) ||
                              p.sku.toLowerCase() === search.trim().toLowerCase()
                          );
                          if (exactMatch) {
                            addToCart(exactMatch, 'strip', 1);
                            setSearch('');
                          }
                        }
                      }
                    }}
                    size="md"
                    style={{ flex: 1 }}
                    styles={{
                      input: {
                        fontSize: 15,
                        fontWeight: 600,
                        borderColor: '#cbd5e1',
                        borderRadius: 8,
                        background: '#ffffff',
                      },
                    }}
                    autoFocus
                  />
                  <Tooltip label="Refresh catalog">
                    <ActionIcon
                      variant="light"
                      color="teal"
                      size="lg"
                      radius="md"
                      onClick={() => refetchProducts()}
                    >
                      <IconRefresh size={18} />
                    </ActionIcon>
                  </Tooltip>
                </Group>

                {productsError && (
                  <Alert color="red" mb="md" title="Could not load medicines">
                    {productsError.message}
                  </Alert>
                )}

                {/* DENSE TABLE VIEW (For fast pharmacists who want maximum medicines visible) */}
                {viewMode === 'dense' ? (
                  <ScrollArea h="calc(100vh - 280px)" offsetScrollbars>
                    {productsLoading ? (
                      <Center py={60}>
                        <Text size="sm" c="dimmed">Loading medicines...</Text>
                      </Center>
                    ) : products.length === 0 ? (
                      <Alert color="blue" title="No medicines found">
                        No medicines matched "{search}". Check Medicines section or Procurement batches.
                      </Alert>
                    ) : (
                      <Table striped highlightOnHover withTableBorder>
                        <Table.Thead style={{ background: '#f8fafc' }}>
                          <Table.Tr>
                            <Table.Th>Medicine & Generic</Table.Th>
                            <Table.Th>Stock Available</Table.Th>
                            <Table.Th>{isPakistan ? 'Patta Rate' : 'Unit Price'}</Table.Th>
                            {isPakistan && <Table.Th>Goli Rate</Table.Th>}
                            <Table.Th ta="right">Instant Dispense</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {products.map((product) => {
                            const inStock = product.in_stock && parseFloat(product.total_stock) > 0;
                            const stockStrips = parseFloat(product.total_stock) || 0;
                            const tabsPerStrip = product.tablets_per_strip || 10;
                            const stripPrice = getProductPriceForUnit(product, 'strip');
                            const goliPrice = getProductPriceForUnit(product, 'unit');

                            return (
                              <Table.Tr key={product.id}>
                                <Table.Td>
                                  <Text size="sm" fw={700} c="#0f172a">
                                    {product.name} {product.strength ? `(${product.strength})` : ''}
                                  </Text>
                                  <Text size="xs" c="dimmed">
                                    {product.generic_name || 'Generic'} · Batch: {product.default_batch_number || '—'}
                                  </Text>
                                </Table.Td>
                                <Table.Td>
                                  <Badge color={inStock ? 'teal' : 'gray'} size="xs" variant={inStock ? 'filled' : 'outline'}>
                                    {inStock
                                      ? product.is_divisible !== false && (product.packaging_type === 'blister' || !product.packaging_type)
                                        ? `${stockStrips.toFixed(1)} ${isPakistan ? 'Pattay' : 'Units'}`
                                        : `${stockStrips.toFixed(0)} ${product.package_label || (product.packaging_type ? product.packaging_type.toUpperCase() : 'BOTTLE')}`
                                      : 'Out of stock'}
                                  </Badge>
                                </Table.Td>
                                <Table.Td>
                                  <Text size="xs" fw={700} c="#0f766e">
                                    {currency} {stripPrice.toFixed(2)}
                                  </Text>
                                </Table.Td>
                                {isPakistan && (
                                  <Table.Td>
                                    <Text size="xs" fw={700} c="#0284c7">
                                      {product.is_divisible !== false && (product.packaging_type === 'blister' || !product.packaging_type)
                                        ? `${currency} ${goliPrice.toFixed(2)}`
                                        : '—'}
                                    </Text>
                                  </Table.Td>
                                )}
                                <Table.Td ta="right">
                                  {product.is_divisible !== false && (product.packaging_type === 'blister' || !product.packaging_type) ? (
                                    <Group gap={4} justify="flex-end">
                                      <Button
                                        size="compact-xs"
                                        color="teal"
                                        disabled={!inStock}
                                        onClick={() => addToCart(product, 'strip', 1)}
                                      >
                                        +1 {isPakistan ? 'Patta' : 'Unit'}
                                      </Button>
                                      {isPakistan && (
                                        <>
                                          <Button
                                            size="compact-xs"
                                            color="cyan"
                                            variant="light"
                                            disabled={!inStock}
                                            onClick={() => addToCart(product, 'unit', 1)}
                                          >
                                            +1 Goli
                                          </Button>
                                          <Button
                                            size="compact-xs"
                                            color="cyan"
                                            variant="light"
                                            disabled={!inStock}
                                            onClick={() => addToCart(product, 'unit', 4)}
                                          >
                                            +4 Goli
                                          </Button>
                                        </>
                                      )}
                                      <Button
                                        size="compact-xs"
                                        color="indigo"
                                        variant="subtle"
                                        disabled={!inStock}
                                        onClick={() => addToCart(product, 'box', 1)}
                                      >
                                        +1 {isPakistan ? 'Dabba' : 'Box'}
                                      </Button>
                                    </Group>
                                  ) : (
                                    <Group gap={4} justify="flex-end">
                                      <Button
                                        size="compact-xs"
                                        color="teal"
                                        disabled={!inStock}
                                        onClick={() => addToCart(product, product.packaging_type || 'bottle', 1)}
                                      >
                                        +1 {product.package_label || (product.packaging_type ? product.packaging_type.toUpperCase() : 'BOTTLE')}
                                      </Button>
                                      <Button
                                        size="compact-xs"
                                        color="teal"
                                        variant="light"
                                        disabled={!inStock}
                                        onClick={() => addToCart(product, product.packaging_type || 'bottle', 2)}
                                      >
                                        +2
                                      </Button>
                                      <Button
                                        size="compact-xs"
                                        color="teal"
                                        variant="light"
                                        disabled={!inStock}
                                        onClick={() => addToCart(product, product.packaging_type || 'bottle', 5)}
                                      >
                                        +5
                                      </Button>
                                    </Group>
                                  )}
                                </Table.Td>
                              </Table.Tr>
                            );
                          })}
                        </Table.Tbody>
                      </Table>
                    )}
                  </ScrollArea>
                ) : (
                  /* VISUAL GRID VIEW (Cards with clear Patta, Goli, and Dabba actions) */
                  <ScrollArea h="calc(100vh - 280px)" offsetScrollbars>
                    {productsLoading ? (
                      <Center py={60}>
                        <Text size="sm" c="dimmed">Loading medicines catalog...</Text>
                      </Center>
                    ) : products.length === 0 ? (
                      <Alert color="blue" title="No medicines found" radius="md">
                        No medicines matched "{search}". Check Medicines section or Procurement batches.
                      </Alert>
                    ) : (
                      <Grid gutter="sm">
                        {products.map((product) => {
                          const inStock = product.in_stock && parseFloat(product.total_stock) > 0;
                          const stockStrips = parseFloat(product.total_stock) || 0;
                          const tabsPerStrip = product.tablets_per_strip || 10;
                          const stripsPerBox = product.strips_per_box || 10;
                          const totalLooseTablets = Math.round(stockStrips * tabsPerStrip);

                          const stripPrice = getProductPriceForUnit(product, 'strip');
                          const goliPrice = getProductPriceForUnit(product, 'unit');
                          const boxPrice = getProductPriceForUnit(product, 'box');

                          return (
                            <Grid.Col span={{ base: 12, sm: 6 }} key={product.id}>
                              <Card
                                shadow="none"
                                padding="sm"
                                radius="md"
                                withBorder
                                style={{
                                  background: inStock ? '#ffffff' : '#f8fafc',
                                  borderColor: inStock ? '#cbd5e1' : '#e2e8f0',
                                  opacity: inStock ? 1 : 0.7,
                                  height: '100%',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justifyContent: 'space-between',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                                }}
                              >
                                <div>
                                  {/* Title & Stock badge */}
                                  <Group justify="space-between" align="flex-start" mb={4}>
                                    <div style={{ flex: 1, minWidth: 0, paddingRight: 6 }}>
                                      <Text fw={800} size="md" c="#0f172a" lineClamp={1}>
                                        {product.name}
                                      </Text>
                                      <Text size="xs" c="#64748b" lineClamp={1}>
                                        {product.generic_name || 'Generic Medicine'} {product.strength ? `· ${product.strength}` : ''}
                                      </Text>
                                    </div>
                                    <Badge
                                      color={inStock ? 'teal' : 'gray'}
                                      size="sm"
                                      variant={inStock ? 'filled' : 'outline'}
                                    >
                                      {inStock ? `${stockStrips.toFixed(1)} Pattay` : 'Out of stock'}
                                    </Badge>
                                  </Group>

                                  {/* Batch and stock count */}
                                  <Group justify="space-between" align="center" mt={4}>
                                    <Text size="xs" c="#0d9488" fw={600}>
                                      Batch: {product.default_batch_number || 'N/A'} · Exp: {product.default_expiry_date || '—'}
                                    </Text>
                                    {inStock && isPakistan && (
                                      <Text size="xs" c="dimmed">
                                        ~{totalLooseTablets} Goliyan total
                                      </Text>
                                    )}
                                  </Group>

                                  {/* PACKAGING RATES (Pakistan: Patta / Goli / Dabba; International: Unit / Box) */}
                                  {product.is_divisible !== false && (product.packaging_type === 'blister' || !product.packaging_type) ? (
                                    <Paper
                                      mt="xs"
                                      p={8}
                                      radius="sm"
                                      style={{
                                        background: '#f8fafc',
                                        border: '1px solid #e2e8f0',
                                      }}
                                    >
                                      <Group justify="space-between" gap={4}>
                                        <div>
                                          <Text size="10px" fw={700} c="#0f766e" tt="uppercase">
                                            {isPakistan ? `1 Patta (${tabsPerStrip} tabs)` : '1 Unit / Strip'}
                                          </Text>
                                          <Text size="xs" fw={800} c="#0f172a">
                                            {currency} {stripPrice.toFixed(2)}
                                          </Text>
                                        </div>
                                        {isPakistan && (
                                          <>
                                            <Divider orientation="vertical" />
                                            <div>
                                              <Text size="10px" fw={700} c="#0284c7" tt="uppercase">
                                                1 Goli (Loose)
                                              </Text>
                                              <Text size="xs" fw={800} c="#0f172a">
                                                {currency} {goliPrice.toFixed(2)}
                                              </Text>
                                            </div>
                                          </>
                                        )}
                                        <Divider orientation="vertical" />
                                        <div>
                                          <Text size="10px" fw={700} c="#4f46e5" tt="uppercase">
                                            {isPakistan ? `1 Dabba (${stripsPerBox} pt)` : `1 Box / Pack (${stripsPerBox} units)`}
                                          </Text>
                                          <Text size="xs" fw={800} c="#0f172a">
                                            {currency} {boxPrice.toFixed(2)}
                                          </Text>
                                        </div>
                                      </Group>
                                    </Paper>
                                  ) : (
                                    <Paper mt="xs" p={8} radius="sm" style={{ background: '#f0fdfa', border: '1px solid #ccfbf1' }}>
                                      <Group justify="space-between" align="center">
                                        <div>
                                          <Text size="10px" fw={700} c="#0f766e" tt="uppercase">
                                            Sealed Package
                                          </Text>
                                          <Text size="xs" fw={800} c="#0f172a">
                                            {product.package_label || (product.packaging_type ? product.packaging_type.toUpperCase() : 'BOTTLE')}
                                          </Text>
                                        </div>
                                        <div>
                                          <Text size="10px" fw={700} c="#0284c7" tt="uppercase">
                                            Unit Price
                                          </Text>
                                          <Text size="xs" fw={800} c="#0f172a">
                                            {currency} {parseFloat(product.selling_price || '0').toFixed(2)}
                                          </Text>
                                        </div>
                                      </Group>
                                    </Paper>
                                  )}
                                </div>

                                {/* OTC 1-CLICK DISPENSING ACTION BUTTONS */}
                                <Stack gap={6} mt="sm">
                                  {product.is_divisible !== false && (product.packaging_type === 'blister' || !product.packaging_type) ? (
                                    <>
                                      {/* Primary Actions: Strip & Box */}
                                      <Group justify="space-between" gap={6}>
                                        <Button
                                          size="xs"
                                          color="teal"
                                          variant="filled"
                                          disabled={!inStock}
                                          leftSection={<IconPackage size={14} />}
                                          onClick={() => addToCart(product, 'strip', 1)}
                                          style={{ flex: 1.2, fontWeight: 700 }}
                                        >
                                          + 1 {isPakistan ? 'Patta' : 'Unit'} ({currency} {stripPrice.toFixed(0)})
                                        </Button>
                                        <Button
                                          size="xs"
                                          color="indigo"
                                          variant="light"
                                          disabled={!inStock}
                                          onClick={() => addToCart(product, 'box', 1)}
                                          style={{ flex: 1 }}
                                        >
                                          + 1 {isPakistan ? 'Dabba' : 'Box'}
                                        </Button>
                                      </Group>

                                      {/* Pakistani Pharmacy: Instant Loose Cut Tablet (Goli) Quick Dispense Buttons */}
                                      {isPakistan && (
                                        <Paper p={4} radius="xs" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                                          <Group justify="space-between" align="center" gap={4}>
                                            <Group gap={4} align="center">
                                              <IconCut size={14} color="#15803d" />
                                              <Text size="10px" fw={700} c="#15803d">
                                                Cut Goli:
                                              </Text>
                                            </Group>
                                            <Group gap={3}>
                                              <Button
                                                size="compact-xs"
                                                variant="filled"
                                                color="green"
                                                disabled={!inStock}
                                                onClick={() => addToCart(product, 'unit', 1)}
                                              >
                                                +1
                                              </Button>
                                              <Button
                                                size="compact-xs"
                                                variant="filled"
                                                color="green"
                                                disabled={!inStock}
                                                onClick={() => addToCart(product, 'unit', 2)}
                                              >
                                                +2
                                              </Button>
                                              <Button
                                                size="compact-xs"
                                                variant="filled"
                                                color="green"
                                                disabled={!inStock}
                                                onClick={() => addToCart(product, 'unit', 4)}
                                              >
                                                +4
                                              </Button>
                                              <Button
                                                size="compact-xs"
                                                variant="filled"
                                                color="green"
                                                disabled={!inStock}
                                                onClick={() => addToCart(product, 'unit', 6)}
                                              >
                                                +6
                                              </Button>
                                              <Button
                                                size="compact-xs"
                                                variant="filled"
                                                color="green"
                                                disabled={!inStock}
                                                onClick={() => addToCart(product, 'unit', 10)}
                                              >
                                                +10
                                              </Button>
                                            </Group>
                                          </Group>
                                        </Paper>
                                      )}
                                    </>
                                  ) : (
                                    <Group justify="space-between" gap={6}>
                                      <Button
                                        size="xs"
                                        color="teal"
                                        variant="filled"
                                        disabled={!inStock}
                                        leftSection={<IconPackage size={14} />}
                                        onClick={() => addToCart(product, product.packaging_type || 'bottle', 1)}
                                        style={{ flex: 1.5, fontWeight: 700 }}
                                      >
                                        + 1 {product.package_label || (product.packaging_type ? product.packaging_type.toUpperCase() : 'BOTTLE')} ({currency} {parseFloat(product.selling_price || '0').toFixed(0)})
                                      </Button>
                                      <Button
                                        size="xs"
                                        color="teal"
                                        variant="light"
                                        disabled={!inStock}
                                        onClick={() => addToCart(product, product.packaging_type || 'bottle', 2)}
                                        style={{ flex: 0.8 }}
                                      >
                                        + 2
                                      </Button>
                                      <Button
                                        size="xs"
                                        color="teal"
                                        variant="light"
                                        disabled={!inStock}
                                        onClick={() => addToCart(product, product.packaging_type || 'bottle', 5)}
                                        style={{ flex: 0.8 }}
                                      >
                                        + 5
                                      </Button>
                                    </Group>
                                  )}
                                </Stack>
                              </Card>
                            </Grid.Col>
                          );
                        })}
                      </Grid>
                    )}
                  </ScrollArea>
                )}
              </Paper>
            </Grid.Col>

            {/* Right Column: Checkout Order Terminal (FIXED VISIBILITY & HIGH UX) */}
            <Grid.Col span={{ base: 12, md: 5, lg: 4.5 }}>
              <Paper
                p="md"
                radius="md"
                withBorder
                style={{
                  background: '#ffffff',
                  borderColor: '#cbd5e1',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)',
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 'calc(100vh - 180px)',
                }}
              >
                {/* Cart Header */}
                <Group justify="space-between" mb="xs">
                  <Group gap="xs">
                    <ThemeIcon color="teal" variant="light" size="md">
                      <IconShoppingCart size={18} />
                    </ThemeIcon>
                    <div>
                      <Text fw={800} size="sm" c="#0f172a">
                        Current Order Cart
                      </Text>
                      <Text size="11px" c="dimmed">
                        {cart.length} item{cart.length === 1 ? '' : 's'} ready to bill
                      </Text>
                    </div>
                  </Group>
                  {cart.length > 0 && (
                    <Button variant="subtle" color="red" size="xs" onClick={clearCart}>
                      Clear All
                    </Button>
                  )}
                </Group>

                <Divider my="xs" color="#e2ece9" />

                {/* Cart Items List Container with Guaranteed Visibility */}
                <div
                  style={{
                    flex: '1 1 auto',
                    minHeight: 240,
                    maxHeight: 'calc(100vh - 440px)',
                    overflowY: 'auto',
                    paddingRight: 4,
                  }}
                >
                  {cart.length === 0 ? (
                    <Stack align="center" justify="center" h={220} c="#94a3b8">
                      <ThemeIcon color="gray" variant="light" size={48} radius="xl">
                        <IconShoppingCart size={24} />
                      </ThemeIcon>
                      <Text size="sm" fw={600} c="#475569">
                        Cart is empty
                      </Text>
                      <Text size="xs" ta="center" c="dimmed" px="md">
                        Click <b>+ 1 Patta</b> or <b>Cut Goli (+1, +2, +4...)</b> on any medicine to add.
                      </Text>
                    </Stack>
                  ) : (
                    <Stack gap="xs">
                      {cart.map((item) => {
                        const tabsPerStrip = item.medicine.tablets_per_strip || 10;
                        const stripsPerBox = item.medicine.strips_per_box || 10;
                        const lineSubtotal = item.quantity * item.unitPrice;

                        // Deduction info
                        const isDivItem = item.medicine.is_divisible !== false && (item.medicine.packaging_type === 'blister' || !item.medicine.packaging_type);
                        const itemPackLabel = item.medicine.package_label || (item.medicine.packaging_type ? item.medicine.packaging_type.toUpperCase() : 'BOTTLE');
                        let deductionInfo = '';
                        let unitDisplay = isPakistan ? 'Patta' : 'Unit';

                        if (!isDivItem) {
                          unitDisplay = itemPackLabel;
                          deductionInfo = `Deducts ${item.quantity} ${itemPackLabel}`;
                        } else if (item.unitType === 'unit') {
                          unitDisplay = isPakistan ? 'Goli (Loose)' : 'Tablet';
                          const stripsDeducted = (item.quantity / tabsPerStrip).toFixed(2);
                          deductionInfo = `Deducts ${stripsDeducted} ${isPakistan ? 'strips' : 'units'} (${item.quantity} loose tablets)`;
                        } else if (item.unitType === 'box') {
                          unitDisplay = isPakistan ? 'Dabba (Box)' : 'Box / Pack';
                          deductionInfo = `Deducts ${item.quantity * stripsPerBox} ${isPakistan ? 'strips' : 'units'} (${item.quantity} boxes)`;
                        } else {
                          unitDisplay = isPakistan ? 'Patta (Strip)' : 'Unit / Strip';
                          deductionInfo = `Deducts ${item.quantity} full ${isPakistan ? 'strips' : 'units'}`;
                        }

                        return (
                          <Paper
                            key={`${item.medicine.id}-${item.unitType}`}
                            p="xs"
                            radius="md"
                            withBorder
                            style={{
                              background: '#ffffff',
                              borderColor: '#e2e8f0',
                              borderLeft: '4px solid #0d9488',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                            }}
                          >
                            {/* Medicine Header & Line Subtotal */}
                            <Group justify="space-between" align="flex-start" wrap="nowrap" mb={4}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <Text size="sm" fw={800} c="#0f172a" truncate>
                                  {item.medicine.name}
                                </Text>
                                <Text size="11px" c="#64748b">
                                  {item.medicine.generic_name || 'Generic'} {item.medicine.strength ? `· ${item.medicine.strength}` : ''}
                                </Text>
                              </div>
                              <Text size="sm" fw={900} c="#0f766e">
                                {currency} {lineSubtotal.toFixed(2)}
                              </Text>
                            </Group>

                            {/* Unit Selector: Pakistan (Patta / Goli / Dabba) vs International (Unit / Box) vs Sealed Package */}
                            <Group justify="space-between" align="center" mt={6} mb={6}>
                              {isDivItem ? (
                                <SegmentedControl
                                  size="xs"
                                  value={item.unitType}
                                  onChange={(val) =>
                                    updateUnitType(item.medicine.id, item.unitType, val)
                                  }
                                  data={
                                    isPakistan
                                      ? [
                                          { label: '🟢 Patta', value: 'strip' },
                                          { label: '✂️ Goli', value: 'unit' },
                                          { label: '📦 Dabba', value: 'box' },
                                        ]
                                      : [
                                          { label: '🟢 Unit / Strip', value: 'strip' },
                                          { label: '📦 Box / Pack', value: 'box' },
                                        ]
                                  }
                                  color="teal"
                                  styles={{
                                    root: { background: '#f1f5f9' },
                                    label: { fontSize: 11, padding: '3px 8px', fontWeight: 600 },
                                  }}
                                />
                              ) : (
                                <Badge size="sm" variant="light" color="cyan">
                                  {itemPackLabel}
                                </Badge>
                              )}
                              <Text size="11px" c="#475569" fw={600}>
                                @ {currency} {item.unitPrice.toFixed(2)} /{' '}
                                {!isDivItem
                                  ? itemPackLabel.toLowerCase()
                                  : item.unitType === 'unit'
                                  ? isPakistan
                                    ? 'goli'
                                    : 'tab'
                                  : item.unitType === 'box'
                                  ? isPakistan
                                    ? 'dabba'
                                    : 'box'
                                  : isPakistan
                                  ? 'patta'
                                  : 'unit'}
                              </Text>
                            </Group>

                            {/* Typeable Quantity Stepper + Trash Button */}
                            <Group justify="space-between" align="center" mt={4}>
                              <Group gap={6} align="center">
                                <ActionIcon
                                  size="sm"
                                  variant="default"
                                  onClick={() => updateQuantity(item.medicine.id, item.unitType, item.quantity - 1)}
                                  disabled={item.quantity <= 1}
                                >
                                  <IconMinus size={12} />
                                </ActionIcon>

                                <NumberInput
                                  size="xs"
                                  min={1}
                                  max={9999}
                                  value={item.quantity}
                                  onChange={(v) =>
                                    updateQuantity(
                                      item.medicine.id,
                                      item.unitType,
                                      typeof v === 'number' && v > 0 ? v : 1
                                    )
                                  }
                                  w={70}
                                  styles={{
                                    input: {
                                      textAlign: 'center',
                                      fontWeight: 800,
                                      fontSize: 13,
                                      padding: '2px 4px',
                                      color: '#0f172a',
                                    },
                                  }}
                                />

                                <ActionIcon
                                  size="sm"
                                  variant="default"
                                  onClick={() => updateQuantity(item.medicine.id, item.unitType, item.quantity + 1)}
                                >
                                  <IconPlus size={12} />
                                </ActionIcon>

                                <Text size="xs" fw={700} c="#0f766e" ml={4}>
                                  {item.quantity} {unitDisplay}
                                </Text>
                              </Group>

                              <ActionIcon
                                size="sm"
                                color="red"
                                variant="subtle"
                                onClick={() => removeFromCart(item.medicine.id, item.unitType)}
                                title="Remove item"
                              >
                                <IconTrash size={14} />
                              </ActionIcon>
                            </Group>

                            {/* Inventory deduction hint */}
                            <Text size="10px" c="#0d9488" mt={4} fw={500}>
                              ↳ {deductionInfo}
                            </Text>
                          </Paper>
                        );
                      })}
                    </Stack>
                  )}
                </div>

                <Divider my="xs" color="#e2ece9" />

                {/* Billing Summary & Payment Controls */}
                <Stack gap={6}>
                  <Group justify="space-between">
                    <Text size="xs" c="#64748b">
                      Subtotal
                    </Text>
                    <Text size="sm" fw={750} c="#0f172a">
                      {currency} {subtotal.toFixed(2)}
                    </Text>
                  </Group>

                  <Grid gutter={6}>
                    <Grid.Col span={6}>
                      <NumberInput
                        size="xs"
                        label="Discount"
                        prefix={`${currency} `}
                        min={0}
                        value={discountAmount}
                        onChange={(v) => setDiscountAmount(typeof v === 'number' ? v : 0)}
                      />
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <NumberInput
                        size="xs"
                        label="Tax"
                        prefix={`${currency} `}
                        min={0}
                        value={taxAmount}
                        onChange={(v) => setTaxAmount(typeof v === 'number' ? v : 0)}
                      />
                    </Grid.Col>
                  </Grid>

                  {/* Net Payable Banner */}
                  <Paper
                    p="xs"
                    radius="md"
                    style={{
                      background: '#f0fdfa',
                      border: '1px solid #99f6e4',
                    }}
                  >
                    <Group justify="space-between" align="center">
                      <div>
                        <Text size="11px" fw={800} c="#115e59" tt="uppercase" style={{ letterSpacing: '0.05em' }}>
                          Total Payable
                        </Text>
                        <Text size="10px" c="#0f766e">
                          {cart.length} item{cart.length === 1 ? '' : 's'} to dispense
                        </Text>
                      </div>
                      <Text size="xl" fw={900} c="#0f766e">
                        {currency} {totalPayable.toFixed(2)}
                      </Text>
                    </Group>
                  </Paper>

                  {/* Payment Method Selector */}
                  <SegmentedControl
                    value={paymentMethod}
                    onChange={(val) => setPaymentMethod(val as any)}
                    data={[
                      { label: 'Cash', value: 'cash' },
                      { label: 'Card', value: 'card' },
                      { label: 'JazzCash / EasyPaisa', value: 'mobile_money' },
                      { label: 'Credit (Udhaar)', value: 'credit' },
                    ]}
                    size="xs"
                    color="teal"
                  />

                  {paymentMethod === 'cash' && (
                    <Stack gap={6}>
                      <Grid gutter={6}>
                        <Grid.Col span={6}>
                          <NumberInput
                            ref={tenderInputRef}
                            size="xs"
                            label="Cash Tendered (F2)"
                            prefix={`${currency} `}
                            placeholder={totalPayable.toFixed(2)}
                            min={0}
                            value={paidAmount || ''}
                            onChange={(v) => setPaidAmount(typeof v === 'number' ? v : 0)}
                          />
                        </Grid.Col>
                        <Grid.Col span={6}>
                          <TextInput
                            size="xs"
                            label="Change Due"
                            value={`${currency} ${changeDue.toFixed(2)}`}
                            readOnly
                            styles={{
                              input: {
                                color: changeDue > 0 ? '#059669' : '#64748b',
                                fontWeight: 900,
                                fontSize: 14,
                                background: changeDue > 0 ? '#ecfdf5' : '#f8fafc',
                                borderColor: changeDue > 0 ? '#6ee7b7' : '#e2e8f0',
                              },
                            }}
                          />
                        </Grid.Col>
                      </Grid>

                      {/* Quick Currency denomination buttons (Pakistan vs International) */}
                      <Group gap={4} justify="center">
                        <Button
                          variant="subtle"
                          size="compact-xs"
                          color="gray"
                          onClick={() => setPaidAmount(totalPayable)}
                        >
                          Exact
                        </Button>
                        {isPakistan ? (
                          <>
                            <Button
                              variant="light"
                              size="compact-xs"
                              color="teal"
                              onClick={() => setPaidAmount(Math.ceil(totalPayable / 100) * 100 || 100)}
                            >
                              +100
                            </Button>
                            <Button
                              variant="light"
                              size="compact-xs"
                              color="teal"
                              onClick={() => setPaidAmount(Math.ceil(totalPayable / 500) * 500 || 500)}
                            >
                              +500
                            </Button>
                            <Button
                              variant="light"
                              size="compact-xs"
                              color="teal"
                              onClick={() => setPaidAmount(Math.ceil(totalPayable / 1000) * 1000 || 1000)}
                            >
                              +1000
                            </Button>
                            <Button
                              variant="light"
                              size="compact-xs"
                              color="teal"
                              onClick={() => setPaidAmount(Math.ceil(totalPayable / 5000) * 5000 || 5000)}
                            >
                              +5000
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="light"
                              size="compact-xs"
                              color="teal"
                              onClick={() => setPaidAmount(Math.ceil(totalPayable / 10) * 10 || 10)}
                            >
                              +10
                            </Button>
                            <Button
                              variant="light"
                              size="compact-xs"
                              color="teal"
                              onClick={() => setPaidAmount(Math.ceil(totalPayable / 20) * 20 || 20)}
                            >
                              +20
                            </Button>
                            <Button
                              variant="light"
                              size="compact-xs"
                              color="teal"
                              onClick={() => setPaidAmount(Math.ceil(totalPayable / 50) * 50 || 50)}
                            >
                              +50
                            </Button>
                            <Button
                              variant="light"
                              size="compact-xs"
                              color="teal"
                              onClick={() => setPaidAmount(Math.ceil(totalPayable / 100) * 100 || 100)}
                            >
                              +100
                            </Button>
                          </>
                        )}
                      </Group>
                    </Stack>
                  )}

                  {/* Checkout Button */}
                  <Button
                    size="md"
                    color="teal"
                    fullWidth
                    disabled={cart.length === 0}
                    loading={checkoutMutation.isPending}
                    onClick={() => checkoutMutation.mutate()}
                    style={{ fontWeight: 800, height: 44, fontSize: 15 }}
                  >
                    Complete Checkout ({currency} {totalPayable.toFixed(2)})
                  </Button>
                </Stack>
              </Paper>
            </Grid.Col>
          </Grid>
        )}

        {/* Tab 2: Sales Invoices History */}
        {activeTab === 'history' && (
          <Paper p="md" radius="md" withBorder style={{ background: '#ffffff', borderColor: '#e2ece9' }}>
            <Group justify="space-between" mb="md">
              <div>
                <Text fw={750} size="md" c="#0f172a">
                  Recent Sales Receipts & Invoices
                </Text>
                <Text size="xs" c="dimmed">
                  Audit trail of all dispensed medicines and recorded payments
                </Text>
              </div>
            </Group>

            <DataTable
              withTableBorder
              borderRadius="md"
              minHeight={240}
              fetching={salesLoading}
              records={salesHistoryData?.data ?? []}
              columns={[
                { accessor: 'invoice_number', title: 'Invoice #' },
                {
                  accessor: 'created_at',
                  title: 'Date / Time',
                  render: ({ created_at }) => new Date(created_at).toLocaleString(),
                },
                {
                  accessor: 'items',
                  title: 'Items Dispensed',
                  render: ({ items }) => (
                    <Text size="xs" c="#334155">
                      {items?.map((it) => `${it.medicine_name} (${it.quantity} ${it.unit_type === 'unit' ? 'goli' : it.unit_type === 'box' ? 'dabba' : 'patta'})`).join(', ')}
                    </Text>
                  ),
                },
                {
                  accessor: 'payment_method',
                  title: 'Payment Method',
                  render: ({ payment_method }) => (
                    <Badge variant="light" color="teal" tt="capitalize">
                      {payment_method.replace('_', ' ')}
                    </Badge>
                  ),
                },
                {
                  accessor: 'total_amount',
                  title: 'Total Amount',
                  textAlign: 'right',
                  render: ({ total_amount }) => (
                    <Text fw={750} c="#0f766e">
                      {currency} {parseFloat(total_amount).toFixed(2)}
                    </Text>
                  ),
                },
                {
                  accessor: 'server_name',
                  title: 'Cashier',
                  render: ({ server_name }) => server_name || 'System',
                },
                {
                  accessor: 'actions',
                  title: '',
                  textAlign: 'right',
                  render: (sale) => (
                    <Tooltip label="View & Print Receipt">
                      <ActionIcon
                        variant="light"
                        color="teal"
                        onClick={() => {
                          setCompletedSale(sale);
                          openReceipt();
                        }}
                      >
                        <IconPrinter size={16} />
                      </ActionIcon>
                    </Tooltip>
                  ),
                },
              ]}
              noRecordsText="No sales recorded yet."
            />
          </Paper>
        )}

        {/* Modal 1: ORDER COMPLETED SUCCESS MODAL */}
        <Modal
          opened={successModalOpened}
          onClose={startNewSale}
          size="md"
          centered
          withCloseButton={false}
          padding="lg"
          radius="lg"
          styles={{
            content: {
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
            },
          }}
        >
          {completedSale && (
            <Stack align="center" gap="md">
              {/* Big Green Success Checkmark */}
              <ThemeIcon size={64} radius="xl" color="teal" variant="light">
                <IconCheck size={36} stroke={3} />
              </ThemeIcon>

              <div style={{ textAlign: 'center' }}>
                <Text fw={850} size="xl" c="#0f172a">
                  Order Completed Successfully!
                </Text>
                <Text size="xs" c="dimmed" mt={2}>
                  Invoice #{completedSale.invoice_number} · Paid via {completedSale.payment_method.toUpperCase()}
                </Text>
              </div>

              {/* Stat Cards: Total Paid & Change Due */}
              <Grid gutter="xs" w="100%">
                <Grid.Col span={4}>
                  <Paper p="xs" radius="md" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <Text size="10px" c="dimmed" tt="uppercase" fw={600}>
                      Total Bill
                    </Text>
                    <Text size="sm" fw={800} c="#0f172a">
                      {currency} {parseFloat(completedSale.total_amount).toFixed(2)}
                    </Text>
                  </Paper>
                </Grid.Col>
                <Grid.Col span={4}>
                  <Paper p="xs" radius="md" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <Text size="10px" c="dimmed" tt="uppercase" fw={600}>
                      Amount Paid
                    </Text>
                    <Text size="sm" fw={800} c="#0f172a">
                      {currency} {parseFloat(completedSale.paid_amount).toFixed(2)}
                    </Text>
                  </Paper>
                </Grid.Col>
                <Grid.Col span={4}>
                  <Paper
                    p="xs"
                    radius="md"
                    style={{
                      background: '#ecfdf5',
                      border: '2px solid #10b981',
                      textAlign: 'center',
                    }}
                  >
                    <Text size="10px" c="#047857" tt="uppercase" fw={800}>
                      Change Due
                    </Text>
                    <Text size="md" fw={900} c="#047857">
                      {currency} {parseFloat(completedSale.change_amount).toFixed(2)}
                    </Text>
                  </Paper>
                </Grid.Col>
              </Grid>

              {/* Items Dispensed Summary */}
              <Paper p="xs" radius="md" w="100%" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <Text size="xs" fw={700} c="#334155" mb={6}>
                  Dispensed Medicines ({completedSale.items.length})
                </Text>
                <ScrollArea mah={120} offsetScrollbars>
                  <Stack gap={4}>
                    {completedSale.items.map((item) => (
                      <Group justify="space-between" key={item.id}>
                        <Text size="xs" c="#1e293b" fw={600}>
                          {item.medicine_name} · <span style={{ color: '#0f766e' }}>{parseFloat(item.quantity)} {item.unit_type === 'unit' ? 'goli' : item.unit_type === 'box' ? 'dabba' : 'patta'}</span>
                        </Text>
                        <Text size="xs" fw={700} c="#0f172a">
                          {currency} {parseFloat(item.subtotal).toFixed(2)}
                        </Text>
                      </Group>
                    ))}
                  </Stack>
                </ScrollArea>
              </Paper>

              {/* Action Buttons */}
              <Group justify="space-between" w="100%" mt="xs">
                <Button
                  variant="outline"
                  color="teal"
                  leftSection={<IconPrinter size={16} />}
                  onClick={() => {
                    closeSuccessModal();
                    openReceipt();
                  }}
                  style={{ flex: 1 }}
                >
                  Thermal Receipt
                </Button>
                <Button
                  color="teal"
                  leftSection={<IconPlus size={16} />}
                  onClick={startNewSale}
                  style={{ flex: 1.2, fontWeight: 800 }}
                  autoFocus
                >
                  Start New Sale (ESC)
                </Button>
              </Group>
            </Stack>
          )}
        </Modal>

        {/* Modal 2: PRINTABLE THERMAL RECEIPT MODAL */}
        <Modal
          opened={receiptModalOpened}
          onClose={closeReceipt}
          title={<Text fw={700}>Pharmacy POS Sales Receipt</Text>}
          centered
          size="sm"
        >
          {completedSale && (
            <Stack gap="xs" style={{ fontFamily: 'monospace', fontSize: 13, background: '#fafafa', padding: 16, borderRadius: 8 }}>
              <div style={{ textAlign: 'center' }}>
                <Text fw={850} size="md" c="#0f172a">
                  {currentTenant?.name ?? 'PHARMALYTICS DISPENSARY'}
                </Text>
                <Text size="11px" c="dimmed">
                  Official Retail Pharmacy Tax Invoice
                </Text>
                <Text size="11px" c="dimmed">
                  Invoice: {completedSale.invoice_number}
                </Text>
                <Text size="11px" c="dimmed">
                  Date: {new Date(completedSale.created_at).toLocaleString()}
                </Text>
              </div>

              <Divider my="xs" style={{ borderStyle: 'dashed' }} />

              <Stack gap={6}>
                {completedSale.items.map((item) => (
                  <Group justify="space-between" key={item.id} align="flex-start">
                    <div style={{ flex: 1 }}>
                      <Text size="xs" fw={700} c="#0f172a">
                        {item.medicine_name}
                      </Text>
                      <Text size="11px" c="dimmed">
                        {parseFloat(item.quantity)} {item.unit_type === 'unit' ? 'goli' : item.unit_type === 'box' ? 'dabba' : 'patta'} @ {currency} {parseFloat(item.unit_price).toFixed(2)}
                      </Text>
                    </div>
                    <Text size="xs" fw={700} c="#0f172a">
                      {currency} {parseFloat(item.subtotal).toFixed(2)}
                    </Text>
                  </Group>
                ))}
              </Stack>

              <Divider my="xs" style={{ borderStyle: 'dashed' }} />

              <Group justify="space-between">
                <Text size="xs">Subtotal:</Text>
                <Text size="xs">
                  {currency} {parseFloat(completedSale.subtotal).toFixed(2)}
                </Text>
              </Group>
              {parseFloat(completedSale.discount_amount) > 0 && (
                <Group justify="space-between">
                  <Text size="xs">Discount:</Text>
                  <Text size="xs" c="red">
                    -{currency} {parseFloat(completedSale.discount_amount).toFixed(2)}
                  </Text>
                </Group>
              )}
              {parseFloat(completedSale.tax_amount) > 0 && (
                <Group justify="space-between">
                  <Text size="xs">Tax:</Text>
                  <Text size="xs">
                    +{currency} {parseFloat(completedSale.tax_amount).toFixed(2)}
                  </Text>
                </Group>
              )}
              <Group justify="space-between">
                <Text size="sm" fw={800}>
                  Total Payable:
                </Text>
                <Text size="sm" fw={900} c="#0f766e">
                  {currency} {parseFloat(completedSale.total_amount).toFixed(2)}
                </Text>
              </Group>

              {completedSale.payment_method === 'cash' && (
                <>
                  <Group justify="space-between">
                    <Text size="xs">Cash Tendered:</Text>
                    <Text size="xs">
                      {currency} {parseFloat(completedSale.paid_amount).toFixed(2)}
                    </Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="xs" fw={700} c="#059669">
                      Change Returned:
                    </Text>
                    <Text size="xs" fw={800} c="#059669">
                      {currency} {parseFloat(completedSale.change_amount).toFixed(2)}
                    </Text>
                  </Group>
                </>
              )}

              <Text size="11px" c="dimmed" ta="center" mt="sm">
                Thank you for your visit! Keep medicines stored below 30°C.
              </Text>

              <Group justify="flex-end" mt="md">
                <Button variant="default" onClick={closeReceipt}>
                  Close
                </Button>
                <Button
                  color="teal"
                  leftSection={<IconPrinter size={16} />}
                  onClick={() => window.print()}
                >
                  Print Receipt
                </Button>
              </Group>
            </Stack>
          )}
        </Modal>

        {/* MODAL: KEYBOARD SHORTCUTS OVERLAY (Zero-Mouse Mode) */}
        <Modal
          opened={shortcutsModalOpened}
          onClose={closeShortcutsModal}
          title={
            <Group gap="xs">
              <IconKeyboard size={20} color="#0d9488" />
              <Text fw={750}>POS Zero-Mouse Keyboard Shortcuts</Text>
            </Group>
          }
          size="md"
          centered
        >
          <Stack gap="sm">
            <Text size="xs" c="dimmed">
              Designed for high-speed pharmacy rush hours. Cashiers and pharmacists can complete full checkout cycles
              without touching the mouse.
            </Text>

            <Paper p="sm" radius="md" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <Grid align="center" gutter="xs">
                <Grid.Col span={4}>
                  <Kbd size="md">F1</Kbd>
                </Grid.Col>
                <Grid.Col span={8}>
                  <Text size="xs" fw={600}>
                    Focus Medicine Search / Barcode Input
                  </Text>
                </Grid.Col>
              </Grid>
            </Paper>

            <Paper p="sm" radius="md" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <Grid align="center" gutter="xs">
                <Grid.Col span={4}>
                  <Kbd size="md">Enter</Kbd>
                </Grid.Col>
                <Grid.Col span={8}>
                  <Text size="xs" fw={600}>
                    Instant Add from Barcode Scanner to Cart
                  </Text>
                </Grid.Col>
              </Grid>
            </Paper>

            <Paper p="sm" radius="md" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <Grid align="center" gutter="xs">
                <Grid.Col span={4}>
                  <Kbd size="md">F2</Kbd>
                </Grid.Col>
                <Grid.Col span={8}>
                  <Text size="xs" fw={600}>
                    Jump to Cash Tendered Input
                  </Text>
                </Grid.Col>
              </Grid>
            </Paper>

            <Paper p="sm" radius="md" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <Grid align="center" gutter="xs">
                <Grid.Col span={4}>
                  <Kbd size="md">F3</Kbd>
                </Grid.Col>
                <Grid.Col span={8}>
                  <Text size="xs" fw={600}>
                    Toggle View (Dense Table vs Card Grid)
                  </Text>
                </Grid.Col>
              </Grid>
            </Paper>

            <Paper p="sm" radius="md" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <Grid align="center" gutter="xs">
                <Grid.Col span={4}>
                  <Kbd size="md">F4</Kbd>
                </Grid.Col>
                <Grid.Col span={8}>
                  <Text size="xs" fw={700} c="teal.8">
                    Instant Complete Checkout & Bill
                  </Text>
                </Grid.Col>
              </Grid>
            </Paper>

            <Paper p="sm" radius="md" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <Grid align="center" gutter="xs">
                <Grid.Col span={4}>
                  <Kbd size="md">F9</Kbd>
                </Grid.Col>
                <Grid.Col span={8}>
                  <Text size="xs" fw={600}>
                    Clear Current Cart / Cancel Order
                  </Text>
                </Grid.Col>
              </Grid>
            </Paper>

            <Paper p="sm" radius="md" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <Grid align="center" gutter="xs">
                <Grid.Col span={4}>
                  <Kbd size="md">Esc</Kbd>
                </Grid.Col>
                <Grid.Col span={8}>
                  <Text size="xs" fw={600}>
                    Dismiss Dialogs / Start New Customer Sale
                  </Text>
                </Grid.Col>
              </Grid>
            </Paper>

            <Group justify="flex-end" mt="md">
              <Button color="teal" onClick={closeShortcutsModal}>
                Got it
              </Button>
            </Group>
          </Stack>
        </Modal>
      </main>
    </AppShell>
  );
}
