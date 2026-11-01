import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import 'mantine-datatable/styles.css';
import './styles.css';
import { ColorSchemeScript } from '@mantine/core';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Pharmalytics',
  description: 'Pharmacy operations, inventory, and sales management.',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><ColorSchemeScript defaultColorScheme="light" /></head>
      <body suppressHydrationWarning><Providers>{children}</Providers></body>
    </html>
  );
}
