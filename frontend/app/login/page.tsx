'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Divider, PasswordInput, Text, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconAlertCircle,
  IconBuildingStore,
  IconCheck,
  IconLock,
  IconMail,
} from '@tabler/icons-react';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { login } from '@/features/auth/api';
import { useAuthStore } from '@/stores/auth-store';

const schema = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
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
        title: 'Welcome back',
        message: `Signed in as ${data.user.name}`,
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
      <section className="auth-aside">
        <div className="brand">
          <span className="brand-mark">✚</span>
          <span className="brand-name">Pharmalytics</span>
        </div>
        <div>
          <div className="eyebrow" style={{ color: '#87d2bf' }}>Pharmacy Operations Hub</div>
          <h1>Every batch, unit, and transaction in its right place.</h1>
          <p>
            Enterprise pharmacy management built for high-throughput counters, strict batch tracking,
            and audit-grade stock movements.
          </p>
        </div>
        <Text size="xs" c="#9ebbb5">
          Multi-tenant isolated workspace &bull; Automated compliance
        </Text>
      </section>

      <section className="auth-main">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          style={{ width: '100%', maxWidth: 440 }}
        >
          <div className="auth-form">
            <div className="eyebrow">Secure Access</div>
            <h2 className="page-title" style={{ fontSize: 28, marginBottom: 4 }}>Sign in</h2>
            <Text c="dimmed" size="sm" mb="xl">
              Access your pharmacy workspace with your team credentials.
            </Text>

            {mutation.isError && (
              <Alert
                icon={<IconAlertCircle size={16} />}
                title="Authentication failed"
                color="red"
                mb="md"
                variant="light"
              >
                {mutation.error.message}
              </Alert>
            )}

            <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
              <TextInput
                label="Email address"
                placeholder="pharmacist@pharmacy.com"
                autoComplete="email"
                leftSection={<IconMail size={16} stroke={1.5} />}
                {...form.register('email')}
                error={form.formState.errors.email?.message}
              />

              <PasswordInput
                mt="md"
                label="Password"
                placeholder="••••••••••••"
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
                loading={mutation.isPending}
              >
                Sign in to workspace
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
              Create & Register Pharmacy Workspace
            </Button>

            <Text ta="center" size="xs" c="dimmed" mt="md">
              Need to create a new tenant partition? Click above to register.
            </Text>
          </div>
        </motion.div>
      </section>
    </main>
  );
}
