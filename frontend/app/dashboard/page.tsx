'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Badge, Button, Group, Text } from '@mantine/core';
import { IconArrowUpRight, IconClipboardList, IconCoins, IconMedicalCross, IconPackage, IconReceipt, IconTruck } from '@tabler/icons-react';
import { AppShell } from '@/components/app-shell';
import { useAuthStore } from '@/stores/auth-store';

const modules = [
  { title: 'Medicine catalog', description: 'Maintain product identity, strengths, dosage forms, and category assignments.', icon: IconMedicalCross, href: '/medicines', status: 'Available' },
  { title: 'Inventory', description: 'Batch traceability, expiry control, FEFO picking, and stock movement history.', icon: IconPackage, href: '/inventory', status: 'Planned' },
  { title: 'Procurement', description: 'Supplier workflows for orders, receiving, invoices, and returns.', icon: IconTruck, href: '/procurement', status: 'Planned' },
  { title: 'POS & sales', description: 'Fast checkout, barcode scanning, payments, and customer returns.', icon: IconReceipt, href: '/sales', status: 'Planned' },
  { title: 'Accounting', description: 'Posting rules, ledgers, cashbook, and customer or supplier balances.', icon: IconCoins, href: '/accounting', status: 'Planned' },
  { title: 'Operations reports', description: 'Sales performance, stock exposure, expiry risk, and profitability.', icon: IconClipboardList, href: '/reports', status: 'Planned' },
];

export default function DashboardPage() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return (
    <AppShell>
      <main className="content">
        <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
          <div><div className="eyebrow">Pharmacy management</div><h1 className="page-title">Good operations start with clear data.</h1><p className="page-subtitle">Your workspace for medicines, inventory, purchasing, and sales.</p></div>
          <Group><Badge variant="light" color={accessToken ? 'teal' : 'orange'}>{accessToken ? 'Connected session' : 'No active session'}</Badge><Button component={Link} href={accessToken ? '/medicines' : '/login'} rightSection={<IconArrowUpRight size={16} />}>{accessToken ? 'Open catalog' : 'Sign in'}</Button></Group>
        </Group>

        <div className="metric-grid">
          {[
            ['Products', '—', 'Connect a tenant to view the catalog'],
            ['Stock on hand', '—', 'Inventory balances are not configured yet'],
            ['Today’s sales', '—', 'Sales workflows are not configured yet'],
            ['Expiry exposure', '—', 'Batch tracking is not configured yet'],
          ].map(([label, value, note]) => (
            <motion.div className="metric-card" key={label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .24 }}>
              <div className="metric-label">{label}</div><div className="metric-value">{value}</div><div className="metric-note">{note}</div>
            </motion.div>
          ))}
        </div>

        <div className="panel" style={{ marginTop: 20 }}>
          <div className="panel-heading"><div><Text fw={700} size="sm">Modules</Text><Text c="dimmed" size="xs" mt={3}>The foundation and catalog APIs are ready to connect.</Text></div></div>
          <div className="module-grid">
            {modules.map(({ title, description, icon: Icon, href, status }, index) => (
              <motion.div key={title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .04, duration: .22 }}>
                <Link className="module-card" href={href} style={{ display: 'block', height: '100%' }}>
                  <Group justify="space-between"><span className="module-icon"><Icon size={19} /></span><Badge variant="light" color={status === 'Available' ? 'teal' : 'gray'}>{status}</Badge></Group>
                  <h3>{title}</h3><p>{description}</p>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </main>
    </AppShell>
  );
}
