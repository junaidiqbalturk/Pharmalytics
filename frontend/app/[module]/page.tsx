'use client';

import { use } from 'react';
import Link from 'next/link';
import { Alert, Button, Text } from '@mantine/core';
import { AppShell } from '@/components/app-shell';

const moduleDetails: Record<string, { title: string; description: string }> = {
  'master-data': { title: 'Master data', description: 'Suppliers, customers, manufacturers, units, and product configuration.' },
  inventory: { title: 'Inventory engine', description: 'Batch management, stock movements, unit conversions, FEFO, adjustments, and valuation.' },
  procurement: { title: 'Procurement', description: 'Purchase orders, goods receiving, supplier invoices, and returns.' },
  sales: { title: 'POS & sales', description: 'Barcode billing, payments, returns, customer credit, and invoice printing.' },
  accounting: { title: 'Accounting', description: 'Automatic journal entries, general ledger, cashbook, balances, and profit and loss.' },
  reports: { title: 'Dashboard & reports', description: 'Sales KPIs, stock reports, expiry exposure, profitability, and operational reports.' },
};

export default function ModulePage({ params }: { params: Promise<{ module: string }> }) {
  const { module } = use(params);
  const details = moduleDetails[module];

  if (!details) {
    return (
      <AppShell>
        <main className="content">
          <Alert color="gray" title="Page not found">
            This Pharmalytics page does not exist.
          </Alert>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="content">
        <div className="eyebrow">Pharmalytics module</div>
        <h1 className="page-title">{details.title}</h1>
        <p className="page-subtitle">{details.description}</p>
        <Alert color="teal" variant="light" mt="xl" title="Module boundary is ready">
          This feature is planned as its own API and frontend module. The foundation and medicine catalog are the first connected workflows.
        </Alert>
        <Link href="/dashboard" style={{ textDecoration: 'none', display: 'inline-block' }}>
          <Button variant="default" mt="lg">Back to overview</Button>
        </Link>
        <Text size="xs" c="dimmed" mt="xl">API version: /api/v1</Text>
      </main>
    </AppShell>
  );
}
