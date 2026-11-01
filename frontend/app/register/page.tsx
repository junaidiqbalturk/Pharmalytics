'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, PasswordInput, Select, Text, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconAlertCircle,
  IconBuildingStore,
  IconCheck,
  IconCoin,
  IconLock,
  IconMail,
  IconUser,
} from '@tabler/icons-react';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { register as registerTenant } from '@/features/auth/api';
import { useAuthStore } from '@/stores/auth-store';

const schema = z
  .object({
    name: z.string().min(2, 'Enter your full name.'),
    email: z.string().email('Enter a valid email address.'),
    tenantName: z.string().min(2, 'Enter your pharmacy name.'),
    currencyCode: z.string().length(3, 'Choose an operating currency.'),
    password: z
      .string()
      .min(12, 'Password must be at least 12 characters.')
      .regex(/[A-Z]/, 'Must include at least one uppercase letter.')
      .regex(/[a-z]/, 'Must include at least one lowercase letter.')
      .regex(/[0-9]/, 'Must include at least one number.'),
    passwordConfirmation: z.string().min(1, 'Please confirm your password.'),
  })
  .refine((values) => values.password === values.passwordConfirmation, {
    message: 'Passwords do not match.',
    path: ['passwordConfirmation'],
  });

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const { accessToken, setSession } = useAuthStore();

  useEffect(() => {
    if (accessToken) {
      router.replace('/medicines');
    }
  }, [accessToken, router]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      email: '',
      tenantName: '',
      currencyCode: 'USD',
      password: '',
      passwordConfirmation: '',
    },
  });

  const currencyCode = useWatch({ control: form.control, name: 'currencyCode' });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      registerTenant({
        name: values.name,
        email: values.email,
        password: values.password,
        password_confirmation: values.passwordConfirmation,
        tenant: {
          name: values.tenantName,
          currency_code: values.currencyCode,
        },
      }),
    onSuccess: ({ data }) => {
      if (data.tenant) {
        setSession({
          accessToken: data.access_token,
          tenantId: data.tenant.id,
          user: data.user,
          tenants: [data.tenant],
        });
      }

      notifications.show({
        title: 'Workspace Initialized',
        message: `${data.tenant?.name ?? 'Workspace'} created with default pharmaceutical categories.`,
        color: 'teal',
        icon: <IconCheck size={16} />,
      });

      router.push('/medicines');
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
          <div className="eyebrow" style={{ color: '#87d2bf' }}>Tenant Provisioning</div>
          <h1>Autonomous Pharmacy Multi-Tenancy.</h1>
          <p>
            Each pharmacy workspace operates with an isolated data partition, automated default
            formulary categories, role hierarchies, and dedicated inventory ledgers.
          </p>
        </div>
        <Text size="xs" c="#9ebbb5">
          Tenant data is encrypted and strictly scoped by tenant boundaries.
        </Text>
      </section>

      <section className="auth-main">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          style={{ width: '100%', maxWidth: 460 }}
        >
          <form
            className="auth-form"
            onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
          >
            <div className="eyebrow">Onboarding</div>
            <h2 className="page-title" style={{ fontSize: 28, marginBottom: 4 }}>
              Register Workspace
            </h2>
            <Text c="dimmed" size="sm" mb="lg">
              Set up your pharmacy workspace and initial administrator account.
            </Text>

            {mutation.isError && (
              <Alert
                icon={<IconAlertCircle size={16} />}
                title="Registration failed"
                color="red"
                mb="md"
                variant="light"
              >
                {mutation.error.message}
              </Alert>
            )}

            <TextInput
              label="Administrator Name"
              placeholder="Dr. Sarah Jenkins"
              autoComplete="name"
              leftSection={<IconUser size={16} stroke={1.5} />}
              {...form.register('name')}
              error={form.formState.errors.name?.message}
            />

            <TextInput
              mt="sm"
              label="Work Email"
              placeholder="admin@cityhealthpharma.com"
              autoComplete="email"
              leftSection={<IconMail size={16} stroke={1.5} />}
              {...form.register('email')}
              error={form.formState.errors.email?.message}
            />

            <TextInput
              mt="sm"
              label="Pharmacy Name"
              placeholder="City Health Central Pharmacy"
              leftSection={<IconBuildingStore size={16} stroke={1.5} />}
              {...form.register('tenantName')}
              error={form.formState.errors.tenantName?.message}
            />

            <Select
              mt="sm"
              label="Base Operating Currency"
              leftSection={<IconCoin size={16} stroke={1.5} />}
              data={[
                { value: 'USD', label: 'USD · United States Dollar ($)' },
                { value: 'PKR', label: 'PKR · Pakistani Rupee (₨)' },
                { value: 'EUR', label: 'EUR · Euro (€)' },
                { value: 'GBP', label: 'GBP · British Pound (£)' },
                { value: 'AED', label: 'AED · UAE Dirham (AED)' },
                { value: 'SAR', label: 'SAR · Saudi Riyal (SAR)' },
              ]}
              value={currencyCode}
              onChange={(value) =>
                form.setValue('currencyCode', value ?? 'USD', { shouldValidate: true })
              }
              error={form.formState.errors.currencyCode?.message}
            />

            <PasswordInput
              mt="sm"
              label="Password"
              placeholder="Min 12 chars with upper, lower, and number"
              autoComplete="new-password"
              leftSection={<IconLock size={16} stroke={1.5} />}
              {...form.register('password')}
              error={form.formState.errors.password?.message}
            />

            <PasswordInput
              mt="sm"
              label="Confirm Password"
              placeholder="Repeat your password"
              autoComplete="new-password"
              leftSection={<IconLock size={16} stroke={1.5} />}
              {...form.register('passwordConfirmation')}
              error={form.formState.errors.passwordConfirmation?.message}
            />

            <Button
              type="submit"
              fullWidth
              mt="lg"
              size="md"
              loading={mutation.isPending}
            >
              Initialize Pharmacy Workspace
            </Button>

            <Text ta="center" size="sm" c="dimmed" mt="md">
              Already have a workspace account?{' '}
              <Link href="/login" style={{ color: 'var(--brand)', fontWeight: 600 }}>
                Sign in
              </Link>
            </Text>
          </form>
        </motion.div>
      </section>
    </main>
  );
}
