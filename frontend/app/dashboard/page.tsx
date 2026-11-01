'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useMemo } from 'react';
import {
  ActionIcon,
  Badge,
  Button,
  Grid,
  Group,
  Paper,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import {
  IconActivityHeartbeat,
  IconAlertTriangle,
  IconArrowRight,
  IconBuildingStore,
  IconClock,
  IconCoins,
  IconMedicalCross,
  IconPackage,
  IconPackageImport,
  IconReceipt,
  IconTrendingUp,
  IconUsers,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '@/components/app-shell';
import { getMedicines } from '@/features/catalog/api';
import { getBatches } from '@/features/inventory/api';
import { getGoodsReceipts } from '@/features/procurement/api';
import { getSales } from '@/features/sales/api';
import { useAuthStore } from '@/stores/auth-store';

// Dynamic import for ApexCharts to prevent SSR window reference error
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

export default function DashboardPage() {
  const { tenantId, tenants } = useAuthStore();
  const currentTenant = tenants.find((t) => t.id === tenantId);
  const currency = currentTenant?.currency_code || 'PKR';

  // Fetch live metrics
  const { data: medicinesData } = useQuery({
    queryKey: ['dashboard-medicines'],
    queryFn: () => getMedicines(),
  });

  const { data: batchesData } = useQuery({
    queryKey: ['dashboard-batches'],
    queryFn: () => getBatches(),
  });

  const { data: salesData } = useQuery({
    queryKey: ['dashboard-sales'],
    queryFn: () => getSales(),
  });

  const { data: grnData } = useQuery({
    queryKey: ['dashboard-grn'],
    queryFn: () => getGoodsReceipts(),
  });

  const medicines = medicinesData?.data || [];
  const batches = batchesData?.data || [];
  const sales = salesData?.data || [];
  const grns = grnData?.data || [];

  // KPI Calculations
  const totalMedicines = medicines.length;
  const totalStockUnits = batches.reduce((acc, b) => acc + Number(b.quantity), 0);
  const totalSalesRevenue = sales.reduce((acc, s) => acc + Number(s.total_amount), 0);

  // Expiry risk breakdown
  const now = Date.now();
  const expiryBreakdown = useMemo(() => {
    let safe = 0;
    let expiring90 = 0;
    let critical30 = 0;
    let expired = 0;

    batches.forEach((b) => {
      const exp = new Date(b.expiry_date).getTime();
      const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
      if (diffDays <= 0) {
        expired++;
      } else if (diffDays <= 30) {
        critical30++;
      } else if (diffDays <= 90) {
        expiring90++;
      } else {
        safe++;
      }
    });

    return { safe, expiring90, critical30, expired };
  }, [batches, now]);

  // Sales Trend Chart Data
  const salesChartData = useMemo(() => {
    // Generate recent 7 days dates
    const days: string[] = [];
    const revenueByDay: Record<string, number> = {};

    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
      days.push(label);
      revenueByDay[dateStr] = 0;
    }

    sales.forEach((s) => {
      const day = s.created_at ? s.created_at.split('T')[0] : '';
      if (revenueByDay[day] !== undefined) {
        revenueByDay[day] += Number(s.total_amount);
      }
    });

    const seriesData = Object.values(revenueByDay);
    // If no sales recorded yet, provide a baseline indicator
    const hasValues = seriesData.some((v) => v > 0);
    const finalSeries = hasValues ? seriesData : [0, 0, 0, 0, 0, 0, 0];

    return {
      categories: days,
      series: [
        {
          name: `Sales Revenue (${currency})`,
          data: finalSeries,
        },
      ],
    };
  }, [sales, currency]);

  // Expiry Donut Chart Data
  const expiryDonutData = useMemo(() => {
    const values = [
      expiryBreakdown.safe,
      expiryBreakdown.expiring90,
      expiryBreakdown.critical30,
      expiryBreakdown.expired,
    ];
    const total = values.reduce((a, b) => a + b, 0);

    return {
      series: total > 0 ? values : [1, 0, 0, 0],
      labels: ['Valid / Safe (>90d)', 'Expiring Soon (31-90d)', 'Critical (<30d)', 'Expired / Quarantine'],
      colors: ['#0d9488', '#f59e0b', '#f97316', '#ef4444'],
    };
  }, [expiryBreakdown]);

  return (
    <AppShell>
      <main className="content">
        <Group justify="space-between" align="flex-start" mb="xl">
          <div>
            <div className="eyebrow">Real-Time Intelligence</div>
            <h1 className="page-title">Pharmacy Operations Command Center</h1>
            <p className="page-subtitle">
              Live dispensing analytics, FEFO expiry exposure, and supply-chain metrics for {currentTenant?.name ?? 'your pharmacy'}.
            </p>
          </div>
          <Group>
            <Button
              component={Link}
              href="/sales"
              color="teal"
              size="md"
              leftSection={<IconReceipt size={18} />}
            >
              Launch Counter POS
            </Button>
          </Group>
        </Group>

        {/* Top 4 Real-Time KPI Cards */}
        <Grid mb="xl">
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Paper p="md" radius="md" style={{ border: '1px solid #e2e8f0', background: '#ffffff' }}>
              <Group justify="space-between" mb="xs">
                <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                  Active Medicines
                </Text>
                <IconMedicalCross size={20} color="#0d9488" />
              </Group>
              <Text size="xl" fw={800} c="#0f172a">
                {totalMedicines}
              </Text>
              <Text size="xs" c="teal.7" fw={500}>
                Registered in catalog
              </Text>
            </Paper>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Paper p="md" radius="md" style={{ border: '1px solid #e2e8f0', background: '#ffffff' }}>
              <Group justify="space-between" mb="xs">
                <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                  Total Units on Hand
                </Text>
                <IconPackage size={20} color="#0284c7" />
              </Group>
              <Text size="xl" fw={800} c="#0f172a">
                {totalStockUnits.toLocaleString()}
              </Text>
              <Text size="xs" c="dimmed">
                Across {batches.length} FEFO batches
              </Text>
            </Paper>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Paper p="md" radius="md" style={{ border: '1px solid #bbf7d0', background: '#f0fdf4' }}>
              <Group justify="space-between" mb="xs">
                <Text size="xs" c="green.8" fw={600} tt="uppercase">
                  Total POS Sales
                </Text>
                <IconTrendingUp size={20} color="#16a34a" />
              </Group>
              <Text size="xl" fw={800} c="green.9">
                {currency} {totalSalesRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </Text>
              <Text size="xs" c="green.7">
                From {sales.length} customer checkouts
              </Text>
            </Paper>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Paper
              p="md"
              radius="md"
              style={{
                border: '1px solid #fecaca',
                background: expiryBreakdown.expired > 0 ? '#fef2f2' : '#ffffff',
              }}
            >
              <Group justify="space-between" mb="xs">
                <Text size="xs" c="red.8" fw={600} tt="uppercase">
                  Expiry Exposure
                </Text>
                <IconAlertTriangle size={20} color="#dc2626" />
              </Group>
              <Text size="xl" fw={800} c="red.9">
                {expiryBreakdown.expiring90 + expiryBreakdown.critical30 + expiryBreakdown.expired} Batches
              </Text>
              <Text size="xs" c="red.7">
                {expiryBreakdown.expired} expired &bull; {expiryBreakdown.critical30} &lt;30 days
              </Text>
            </Paper>
          </Grid.Col>
        </Grid>

        {/* Interactive Charts Section */}
        <Grid mb="xl">
          {/* Chart 1: Revenue Trend */}
          <Grid.Col span={{ base: 12, lg: 8 }}>
            <Paper p="lg" radius="md" style={{ border: '1px solid #e2e8f0', background: '#ffffff', minHeight: 400 }}>
              <Group justify="space-between" mb="md">
                <div>
                  <Text size="sm" fw={700} c="#0f172a">
                    7-Day OTC Counter Sales Revenue Trend
                  </Text>
                  <Text size="xs" c="dimmed">
                    Daily transaction velocity and billing volume in {currency}
                  </Text>
                </div>
                <Badge color="teal" variant="light">
                  Live Terminal Feed
                </Badge>
              </Group>

              <Chart
                options={{
                  chart: {
                    type: 'area',
                    toolbar: { show: false },
                    fontFamily: 'Inter, sans-serif',
                  },
                  colors: ['#0d9488'],
                  stroke: { curve: 'smooth', width: 2.5 },
                  fill: {
                    type: 'gradient',
                    gradient: {
                      shadeIntensity: 1,
                      opacityFrom: 0.45,
                      opacityTo: 0.05,
                      stops: [0, 90, 100],
                    },
                  },
                  dataLabels: { enabled: false },
                  xaxis: {
                    categories: salesChartData.categories,
                    labels: { style: { fontSize: '11px', colors: '#64748b' } },
                  },
                  yaxis: {
                    labels: {
                      formatter: (val: number) => `${currency} ${val.toFixed(0)}`,
                      style: { fontSize: '11px', colors: '#64748b' },
                    },
                  },
                  tooltip: {
                    theme: 'dark',
                    y: {
                      formatter: (val: number) => `${currency} ${val.toFixed(2)}`,
                    },
                  },
                  grid: { borderColor: '#f1f5f9' },
                }}
                series={salesChartData.series}
                type="area"
                height={300}
              />
            </Paper>
          </Grid.Col>

          {/* Chart 2: Expiry Risk Radar / Donut */}
          <Grid.Col span={{ base: 12, lg: 4 }}>
            <Paper p="lg" radius="md" style={{ border: '1px solid #e2e8f0', background: '#ffffff', minHeight: 400 }}>
              <Group justify="space-between" mb="md">
                <div>
                  <Text size="sm" fw={700} c="#0f172a">
                    FEFO Expiry Risk Distribution
                  </Text>
                  <Text size="xs" c="dimmed">
                    Batch lifecycle health
                  </Text>
                </div>
                <IconActivityHeartbeat size={18} color="#0d9488" />
              </Group>

              <Chart
                options={{
                  chart: { type: 'donut', fontFamily: 'Inter, sans-serif' },
                  labels: expiryDonutData.labels,
                  colors: expiryDonutData.colors,
                  legend: { position: 'bottom', fontSize: '11px' },
                  dataLabels: { enabled: true, dropShadow: { enabled: false } },
                  tooltip: {
                    theme: 'dark',
                    y: { formatter: (val: number) => `${val} batch${val === 1 ? '' : 'es'}` },
                  },
                  plotOptions: {
                    pie: {
                      donut: {
                        size: '65%',
                        labels: {
                          show: true,
                          total: {
                            show: true,
                            label: 'Total Batches',
                            formatter: () => `${batches.length}`,
                          },
                        },
                      },
                    },
                  },
                }}
                series={expiryDonutData.series}
                type="donut"
                height={300}
              />
            </Paper>
          </Grid.Col>
        </Grid>

        {/* Quick Action Navigator */}
        <Paper p="lg" radius="md" style={{ border: '1px solid #e2e8f0', background: '#ffffff' }}>
          <Text size="sm" fw={700} c="#0f172a" mb="sm">
            Quick Actions & Operations Navigator
          </Text>
          <Grid>
            {[
              {
                title: 'Counter Terminal (POS)',
                desc: 'Open the barcode scanner and counter terminal for walk-in patient dispensing.',
                href: '/sales',
                icon: IconReceipt,
                color: 'teal',
              },
              {
                title: 'FEFO Inventory Engine',
                desc: 'Inspect batch expiry dates, trace audit movements, or perform physical stocktakes.',
                href: '/inventory',
                icon: IconPackage,
                color: 'blue',
              },
              {
                title: 'Receive Goods (GRN)',
                desc: 'Intake supplier delivery shipments and auto-register batches into stock.',
                href: '/procurement',
                icon: IconPackageImport,
                color: 'violet',
              },
              {
                title: 'Double-Entry Accounting',
                desc: 'Review automated journal entries, check debit/credit balance, and view the General Ledger.',
                href: '/accounting',
                icon: IconCoins,
                color: 'orange',
              },
            ].map((action, i) => {
              const Icon = action.icon;
              return (
                <Grid.Col span={{ base: 12, sm: 6, md: 3 }} key={i}>
                  <Paper
                    component={Link}
                    href={action.href}
                    p="md"
                    radius="md"
                    style={{
                      border: '1px solid #e2e8f0',
                      background: '#f8fafc',
                      display: 'block',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer',
                    }}
                  >
                    <Group justify="space-between" mb="xs">
                      <ActionIcon color={action.color} variant="light" size="lg" radius="md">
                        <Icon size={20} />
                      </ActionIcon>
                      <IconArrowRight size={16} color="#94a3b8" />
                    </Group>
                    <Text size="sm" fw={700} c="#0f172a">
                      {action.title}
                    </Text>
                    <Text size="xs" c="dimmed" mt={4}>
                      {action.desc}
                    </Text>
                  </Paper>
                </Grid.Col>
              );
            })}
          </Grid>
        </Paper>
      </main>
    </AppShell>
  );
}
