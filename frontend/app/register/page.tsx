'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Badge,
  Button,
  Group,
  PasswordInput,
  Select,
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
  IconCoin,
  IconLock,
  IconMail,
  IconMapPin,
  IconMedicalCross,
  IconPackage,
  IconReceipt2,
  IconShieldCheck,
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
    name: z.string().min(2, 'Please enter your full name.'),
    email: z.string().email('Please enter a valid email address.'),
    tenantName: z.string().min(2, 'Please enter your pharmacy or medical store name.'),
    countryCode: z.string().length(2, 'Please select your operating country.'),
    currencyCode: z.string().length(3, 'Please select your operating currency.'),
    password: z
      .string()
      .min(12, 'Password must be at least 12 characters.')
      .regex(/[A-Z]/, 'Must include at least one uppercase letter.')
      .regex(/[a-z]/, 'Must include at least one lowercase letter.')
      .regex(/[0-9]/, 'Must include at least one number.'),
    passwordConfirmation: z.string().min(1, 'Please confirm your password.'),
  })
  .refine((values) => values.password === values.passwordConfirmation, {
    message: 'Passwords do not match. Please re-enter identical passwords.',
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
      countryCode: 'PK',
      currencyCode: 'PKR',
      password: '',
      passwordConfirmation: '',
    },
  });

  const countryCode = useWatch({ control: form.control, name: 'countryCode' });
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
          country_code: values.countryCode,
          country:
            values.countryCode === 'PK'
              ? 'Pakistan'
              : values.countryCode === 'US'
              ? 'United States'
              : values.countryCode === 'GB'
              ? 'United Kingdom'
              : values.countryCode === 'AE'
              ? 'United Arab Emirates'
              : values.countryCode === 'SA'
              ? 'Saudi Arabia'
              : 'International',
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
        title: 'Welcome to Pharmalytics!',
        message: `${data.tenant?.name ?? 'Your pharmacy store'} is live with essential medicine categories and ready for sales.`,
        color: 'teal',
        icon: <IconCheck size={16} />,
      });

      router.push('/medicines');
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
            Next-Generation Pharmacy Retail
          </Badge>
          <h1 style={{ color: '#ffffff', fontSize: 'clamp(32px, 3.8vw, 48px)', lineHeight: 1.15, fontWeight: 800, margin: '0 0 16px 0' }}>
            Launch Your Smart Digital Pharmacy in Under 60 Seconds.
          </h1>
          <p style={{ color: '#ccfbf1', fontSize: 16, lineHeight: 1.6, margin: '0 0 28px 0', maxWidth: 500 }}>
            Whether you operate a bustling community medical store in Pakistan or a modern clinical health chain abroad — Pharmalytics unifies your sales counter, FEFO inventory, and financial accounting into one effortless system.
          </p>

          {/* Core Feature Value Props */}
          <Stack gap="md">
            <Group gap="sm" wrap="nowrap" align="flex-start">
              <ThemeIcon color="teal" variant="light" size="md" radius="xl" style={{ background: '#134e48', color: '#5eead4' }}>
                <IconReceipt2 size={18} />
              </ThemeIcon>
              <div>
                <Text size="sm" fw={700} c="#ffffff">
                  Tailored to Local Dispensing Habits
                </Text>
                <Text size="xs" c="#99f6e4">
                  Full Pakistani market support for loose tablet (Goli), strip (Patta), and box (Dabba) dispensing with zero calculation errors.
                </Text>
              </div>
            </Group>

            <Group gap="sm" wrap="nowrap" align="flex-start">
              <ThemeIcon color="teal" variant="light" size="md" radius="xl" style={{ background: '#134e48', color: '#5eead4' }}>
                <IconPackage size={18} />
              </ThemeIcon>
              <div>
                <Text size="sm" fw={700} c="#ffffff">
                  Automate Supplier Shipments
                </Text>
                <Text size="xs" c="#99f6e4">
                  Order from distributors and intake goods receiving notes (GRN) that instantly create traceable inventory batches.
                </Text>
              </div>
            </Group>

            <Group gap="sm" wrap="nowrap" align="flex-start">
              <ThemeIcon color="teal" variant="light" size="md" radius="xl" style={{ background: '#134e48', color: '#5eead4' }}>
                <IconShieldCheck size={18} />
              </ThemeIcon>
              <div>
                <Text size="sm" fw={700} c="#ffffff">
                  Audit-Ready Financial Peace of Mind
                </Text>
                <Text size="xs" c="#99f6e4">
                  Real-time double-entry general ledger and automated P&L statements without needing an in-house accountant.
                </Text>
              </div>
            </Group>
          </Stack>
        </div>

        <Text size="xs" c="#a7f3d0">
          No credit card required &bull; 100% Private & encrypted store data &bull; Cancel anytime
        </Text>
      </section>

      {/* Registration Form */}
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
            <div className="eyebrow">Get Started Free</div>
            <h2 className="page-title" style={{ fontSize: 28, marginBottom: 4 }}>
              Register Your Pharmacy
            </h2>
            <Text c="dimmed" size="sm" mb="lg">
              Set up your pharmacy store and initial manager account in moments.
            </Text>

            {mutation.isError && (
              <Alert
                icon={<IconAlertCircle size={16} />}
                title="Registration failed"
                color="red"
                mb="md"
                variant="light"
              >
                {mutation.error.message || 'Could not create pharmacy account. Please verify details and try again.'}
              </Alert>
            )}

            <TextInput
              label="Pharmacy Owner / Manager Name"
              placeholder="e.g. Dr. Junaid Iqbal"
              autoComplete="name"
              leftSection={<IconUser size={16} stroke={1.5} />}
              {...form.register('name')}
              error={form.formState.errors.name?.message}
            />

            <TextInput
              mt="sm"
              label="Official Business Email"
              placeholder="owner@yourpharmacy.com"
              autoComplete="email"
              leftSection={<IconMail size={16} stroke={1.5} />}
              {...form.register('email')}
              error={form.formState.errors.email?.message}
            />

            <TextInput
              mt="sm"
              label="Pharmacy or Medical Store Name"
              placeholder="e.g. City Care Meds & Clinic"
              leftSection={<IconBuildingStore size={16} stroke={1.5} />}
              {...form.register('tenantName')}
              error={form.formState.errors.tenantName?.message}
            />

            <Select
              mt="sm"
              label="Pharmacy Location / Country"
              description="Automatically activates localized retail dispensing terms (Patta, Goli in Pakistan)."
              leftSection={<IconMapPin size={16} stroke={1.5} />}
              data={[
                { value: 'PK', label: '🇵🇰 Pakistan (Enables Patta / Goli / Dabba OTC Mode)' },
                { value: 'US', label: '🇺🇸 United States (Standard Unit / Pack Mode)' },
                { value: 'GB', label: '🇬🇧 United Kingdom (Standard Unit / Pack Mode)' },
                { value: 'AE', label: '🇦🇪 United Arab Emirates' },
                { value: 'SA', label: '🇸🇦 Saudi Arabia' },
              ]}
              value={countryCode}
              onChange={(value) => {
                const c = value ?? 'PK';
                form.setValue('countryCode', c, { shouldValidate: true });
                if (c === 'PK') {
                  form.setValue('currencyCode', 'PKR', { shouldValidate: true });
                } else if (c === 'US') {
                  form.setValue('currencyCode', 'USD', { shouldValidate: true });
                } else if (c === 'GB') {
                  form.setValue('currencyCode', 'GBP', { shouldValidate: true });
                } else if (c === 'AE') {
                  form.setValue('currencyCode', 'AED', { shouldValidate: true });
                } else if (c === 'SA') {
                  form.setValue('currencyCode', 'SAR', { shouldValidate: true });
                }
              }}
              error={form.formState.errors.countryCode?.message}
            />

            <Select
              mt="sm"
              label="Store Billing Currency"
              leftSection={<IconCoin size={16} stroke={1.5} />}
              data={[
                { value: 'PKR', label: 'PKR · Pakistani Rupee (₨)' },
                { value: 'USD', label: 'USD · United States Dollar ($)' },
                { value: 'EUR', label: 'EUR · Euro (€)' },
                { value: 'GBP', label: 'GBP · British Pound (£)' },
                { value: 'AED', label: 'AED · UAE Dirham (AED)' },
                { value: 'SAR', label: 'SAR · Saudi Riyal (SAR)' },
              ]}
              value={currencyCode}
              onChange={(value) =>
                form.setValue('currencyCode', value ?? 'PKR', { shouldValidate: true })
              }
              error={form.formState.errors.currencyCode?.message}
            />

            <PasswordInput
              mt="sm"
              label="Account Password"
              placeholder="Min 12 chars with uppercase, lowercase & numbers"
              autoComplete="new-password"
              leftSection={<IconLock size={16} stroke={1.5} />}
              {...form.register('password')}
              error={form.formState.errors.password?.message}
            />

            <PasswordInput
              mt="sm"
              label="Confirm Password"
              placeholder="Re-type your password"
              autoComplete="new-password"
              leftSection={<IconLock size={16} stroke={1.5} />}
              {...form.register('passwordConfirmation')}
              error={form.formState.errors.passwordConfirmation?.message}
            />

            <Button
              type="submit"
              fullWidth
              mt="xl"
              size="md"
              color="teal"
              loading={mutation.isPending}
            >
              Start Free Pharmacy Account
            </Button>

            <Text size="xs" c="dimmed" ta="center" mt="md">
              Already have a pharmacy account?{' '}
              <Link href="/login" style={{ color: '#0d9488', fontWeight: 700 }}>
                Sign in here
              </Link>
            </Text>
          </form>
        </motion.div>
      </section>
    </main>
  );
}
