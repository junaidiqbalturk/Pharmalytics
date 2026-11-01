'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Badge,
  Button,
  Divider,
  Group,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconAlertCircle,
  IconBolt,
  IconBuildingStore,
  IconCheck,
  IconChartBar,
  IconLock,
  IconMail,
  IconMedicalCross,
  IconShieldCheck,
} from '@tabler/icons-react';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { login } from '@/features/auth/api';
import { useAuthStore } from '@/stores/auth-store';

const schema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(1, 'Please enter your password.'),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { accessToken, user, setSession } = useAuthStore();

  useEffect(() => {
    if (accessToken) {
      if (user?.roles?.includes('cashier')) {
        router.replace('/sales');
      } else {
        router.replace('/medicines');
      }
    }
  }, [accessToken, user, router]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      login({ ...values, device_name: 'pharmalytics-web' }),
    onSuccess: ({ data }) => {
      const tenantId = data.default_tenant_id ?? data.tenants?.[0]?.id;
      if (tenantId) {
        setSession({
          accessToken: data.access_token,
          tenantId,
          user: data.user,
          tenants: data.tenants ?? [],
        });
      }

      notifications.show({
        title: 'Welcome back!',
        message: `Signed in as ${data.user.name}. Opening your pharmacy terminal...`,
        color: 'teal',
        icon: <IconCheck size={16} />,
      });

      const isCashier = Boolean(data.user.roles?.includes('cashier'));
      if (isCashier) {
        router.push('/sales');
      } else {
        router.push('/medicines');
      }
    },
  });

  return (
    <main className="auth-page">
      {/* Brand Hero Showcase */}
      <section className="auth-aside">
        <div className="brand" style={{ padding: 0 }}>
          <span className="brand-mark">
            <IconMedicalCross size={22} stroke={2.5} />
          </span>
          <span className="brand-name" style={{ color: '#ffffff' }}>Pharmalytics</span>
        </div>

        <div>
          <Badge color="teal" variant="light" size="lg" radius="sm" mb="md" style={{ background: '#134e48', color: '#5eead4' }}>
            All-in-One Pharmacy Operating System
          </Badge>
          <h1 style={{ color: '#ffffff', fontSize: 'clamp(32px, 3.8vw, 48px)', lineHeight: 1.15, fontWeight: 800, margin: '0 0 16px 0' }}>
            Run a Faster, Smarter, and More Profitable Pharmacy.
          </h1>
          <p style={{ color: '#ccfbf1', fontSize: 16, lineHeight: 1.6, margin: '0 0 28px 0', maxWidth: 500 }}>
            From lightning-fast counter billing to FEFO batch tracking and automated accounting — Pharmalytics empowers your team to serve walk-in patients faster and eliminate expired medicine losses.
          </p>

          {/* Business Value Highlights */}
          <Stack gap="md">
            <Group gap="sm" wrap="nowrap" align="flex-start">
              <ThemeIcon color="teal" variant="light" size="md" radius="xl" style={{ background: '#134e48', color: '#5eead4' }}>
                <IconBolt size={18} />
              </ThemeIcon>
              <div>
                <Text size="sm" fw={700} c="#ffffff">
                  Rapid OTC Counter Billing
                </Text>
                <Text size="xs" c="#99f6e4">
                  Barcode scanning, instant loose tablet (Goli) and strip (Patta) sales with automatic change calculation.
                </Text>
              </div>
            </Group>

            <Group gap="sm" wrap="nowrap" align="flex-start">
              <ThemeIcon color="teal" variant="light" size="md" radius="xl" style={{ background: '#134e48', color: '#5eead4' }}>
                <IconShieldCheck size={18} />
              </ThemeIcon>
              <div>
                <Text size="sm" fw={700} c="#ffffff">
                  Zero Expired Stock Waste
                </Text>
                <Text size="xs" c="#99f6e4">
                  First-Expired First-Out (FEFO) automated allocation prevents shelf obsolescence.
                </Text>
              </div>
            </Group>

            <Group gap="sm" wrap="nowrap" align="flex-start">
              <ThemeIcon color="teal" variant="light" size="md" radius="xl" style={{ background: '#134e48', color: '#5eead4' }}>
                <IconChartBar size={18} />
              </ThemeIcon>
              <div>
                <Text size="sm" fw={700} c="#ffffff">
                  Automated Daily Profit & Loss
                </Text>
                <Text size="xs" c="#99f6e4">
                  Every counter sale and shipment automatically updates your cashbook and double-entry general ledger.
                </Text>
              </div>
            </Group>
          </Stack>
        </div>

        <Text size="xs" c="#a7f3d0">
          Trusted by modern retail & clinical pharmacies worldwide &bull; Bank-grade security &bull; 99.9% Uptime
        </Text>
      </section>

      {/* Login Form */}
      <section className="auth-main">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          style={{ width: '100%', maxWidth: 440 }}
        >
          <div className="auth-form">
            <div className="eyebrow">Welcome Back</div>
            <h2 className="page-title" style={{ fontSize: 28, marginBottom: 4 }}>Sign in to your Store</h2>
            <Text c="dimmed" size="sm" mb="xl">
              Access your pharmacy counter, inventory batches, and daily sales reports.
            </Text>

            {mutation.isError && (
              <Alert
                icon={<IconAlertCircle size={16} />}
                title="Sign-in failed"
                color="red"
                mb="md"
                variant="light"
              >
                {mutation.error.message || 'Incorrect email or password. Please verify and try again.'}
              </Alert>
            )}

            <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
              <TextInput
                label="Staff / Manager Email"
                placeholder="pharmacist@yourstore.com"
                autoComplete="email"
                leftSection={<IconMail size={16} stroke={1.5} />}
                {...form.register('email')}
                error={form.formState.errors.email?.message}
              />

              <PasswordInput
                mt="md"
                label="Password"
                placeholder="Enter your password"
                autoComplete="current-password"
                leftSection={<IconLock size={16} stroke={1.5} />}
                {...form.register('password')}
                error={form.formState.errors.password?.message}
              />

              <Button
                type="submit"
                fullWidth
                mt="xl"
                size="md"
                color="teal"
                loading={mutation.isPending}
              >
                Sign in to Pharmacy
              </Button>
            </form>

            <Divider my="xl" label="New to Pharmalytics?" labelPosition="center" />

            <Button
              component={Link}
              href="/register"
              variant="outline"
              color="teal"
              size="md"
              fullWidth
              leftSection={<IconBuildingStore size={18} stroke={1.8} />}
            >
              Start Free Pharmacy Account
            </Button>

            <Text ta="center" size="xs" c="dimmed" mt="md">
              Opening a new medical store or clinic branch? Setup takes under 60 seconds.
            </Text>
          </div>
        </motion.div>
      </section>
    </main>
  );
}
