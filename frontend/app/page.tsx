'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Container,
  Divider,
  Grid,
  Group,
  Modal,
  Paper,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  ThemeIcon,
  Title,
  Tooltip,
  useMantineColorScheme,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconArrowRight,
  IconBolt,
  IconBrandApple,
  IconBrandGooglePlay,
  IconBuildingStore,
  IconChartBar,
  IconCheck,
  IconClock,
  IconDeviceMobile,
  IconFileInvoice,
  IconHelpCircle,
  IconKeyboard,
  IconMessageDots,
  IconMoon,
  IconPackages,
  IconPill,
  IconRobot,
  IconScan,
  IconShieldLock,
  IconSparkles,
  IconSun,
  IconTruckDelivery,
} from '@tabler/icons-react';
import { AnimatePresence, motion } from 'framer-motion';

export default function LandingPage() {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  // State for active feature tab
  const [activeFeatureTab, setActiveFeatureTab] = useState<string>('pos');
  // State for lightbox screenshot modal
  const [lightboxOpened, { open: openLightbox, close: closeLightbox }] = useDisclosure(false);
  const [selectedScreenshot, setSelectedScreenshot] = useState<{ src: string; title: string; desc: string }>({
    src: '/screenshots/POS.jpeg',
    title: 'Point of Sale (POS)',
    desc: 'High-speed cashier terminal with hotkeys and loose tablet dispensing',
  });

  // State for mobile waitlist modal
  const [waitlistModalOpened, { open: openWaitlist, close: closeWaitlist }] = useDisclosure(false);
  const [waitlistType, setWaitlistType] = useState<'mobile' | 'ai'>('mobile');
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);

  // Features data
  const coreFeatures = [
    {
      id: 'pos',
      label: 'Zero-Mouse POS',
      icon: IconKeyboard,
      badge: 'High-Speed Kiosk',
      title: 'Zero-Mouse POS Billing & Loose Dispensing',
      description:
        'Engineered for intense pharmacy rush hours. Complete checkout in under 1.5 seconds using keyboard hotkeys (F1-F12), automated barcode scanning, multi-tender cash/card, and unit dispensing.',
      highlight: 'Pakistani Goli / Patta / Dabba native unit conversions with zero stock breakage discrepancies.',
      image: '/screenshots/POS.jpeg',
      points: [
        'Global hotkeys: F1 (Search), F2 (Cash Tender), F3 (Dense View), F4 (Complete Sale), F12 (Shortcuts)',
        'Native Loose Dispensing: Sell by full Box (Dabba), Strip (Patta), or Loose Tablet (Goli)',
        'Instant Barcode Auto-Add: Automatic focus on barcode input with instant cart increment',
        'Thermal Receipt & Split Tender: Instant 80mm/58mm thermal receipts with Cash and Digital split payments',
      ],
    },
    {
      id: 'inventory',
      label: 'FEFO Inventory',
      icon: IconPackages,
      badge: 'Expiry Defense',
      title: 'Intelligent Inventory & FEFO Expiry Engine',
      description:
        'Protect pharmacy margins from expiration losses. First-Expiry-First-Out (FEFO) automatically dispatches older batches first, while real-time radar tracks 30, 60, and 90-day risk windows.',
      highlight: 'Proactive expiry radar alerting you before costly batches expire on your shelves.',
      image: '/screenshots/inventory-engine.jpeg',
      points: [
        'Automated FEFO Selection: System prioritizes earliest expiring batches at checkout automatically',
        '30/60/90 Days Expiry Radar: Visual breakdown of upcoming expiries for proactive vendor returns',
        'Stock Adjustment Approvals: Reason-coded stock balance modifications with complete audit logging',
        'Real-time Minimum Stock Warnings: Instant alerts for fast-moving medicines nearing reorder levels',
      ],
    },
    {
      id: 'accounting',
      label: 'Automated Accounting',
      icon: IconFileInvoice,
      badge: 'GAAP Double-Entry',
      title: 'Automated ERP Accounting & General Ledger',
      description:
        'No manual bookkeeping needed. Every POS sale, customer return, purchase order, and supplier receipt automatically generates GAAP double-entry journal entries in real time.',
      highlight: 'Real-time Chart of Accounts, Trial Balance, and automated ledger postings.',
      image: '/screenshots/accounting-engine.jpeg',
      points: [
        'Automated POS Journaling: Instant Debit Cash (1010) and Credit Sales Revenue (4010) on checkout',
        'Automated GRN Journaling: Instant Debit Inventory Asset (1200) and Credit Accounts Payable (2010)',
        'Standard Chart of Accounts: Pre-seeded 5-digit GAAP accounts tailored for retail and wholesale pharmacy',
        'Financial Reporting: Live Trial Balance, General Ledger statements, and normal balance calculations',
      ],
    },
    {
      id: 'procurement',
      label: 'Procurement & GRN',
      icon: IconTruckDelivery,
      badge: 'Vendor Lifecycle',
      title: 'Procurement, Purchase Orders & Goods Receipts',
      description:
        'Streamline supplier relationships from purchase order creation to Goods Receipt Notes (GRN). Verify delivered batches against PO quantities and maintain accurate vendor ledgers.',
      highlight: '3-way matching between Purchase Order, Goods Receipt, and Supplier Invoices.',
      image: '/screenshots/procurement.jpeg',
      points: [
        'PO & GRN Workflow: Convert vendor purchase orders into Goods Receipt Notes with batch verification',
        'Supplier Directory & Ledgers: Track outstanding payables, credit limits, and historical purchase prices',
        'Batch & Expiry Intake: Record batch number, manufacture date, and expiry date right at arrival',
        'Direct Inventory Ingestion: Accepted receipts automatically update warehouse and shelf stock counts',
      ],
    },
    {
      id: 'master',
      label: 'Master Catalog',
      icon: IconPill,
      badge: 'Formulary Master',
      title: 'Pharmaceutical Master Catalog & Drug Directory',
      description:
        'Standardize your entire drug formulary. Manage medicines, generic molecules, therapeutic categories, manufacturers, dosage forms, and packaging conversions in one unified system.',
      highlight: 'Comprehensive catalog pre-seeded with Pakistani and international pharmaceutical brands.',
      image: '/screenshots/master-data-management.jpeg',
      points: [
        'Comprehensive Drug Registry: Brand names, generic formulations, strengths, and dosage forms',
        'Packaging Hierarchy: Configure Tablets per Strip, Strips per Box for automated fractional pricing',
        'Therapeutic Classifications: Antibiotics, Analgesics, Cardiac, Diabetics, and more',
        'Controlled Substance Flags: Mark prescription-only and narcotic medications with compliance guards',
      ],
    },
    {
      id: 'security',
      label: 'Multi-Tenant RBAC',
      icon: IconShieldLock,
      badge: 'Enterprise Security',
      title: 'Strict Multi-Tenant Isolation & Role-Based Access',
      description:
        'Operate with complete confidence. Every tenant partition is isolated with dedicated data boundaries. Assign granular roles and permissions so cashiers only see POS and owners see full finances.',
      highlight: '12 granular permissions across 5 built-in roles: Owner, Pharmacist, Cashier, Inventory Manager.',
      image: '/screenshots/access-control.jpeg',
      points: [
        'Strict Data Partitioning: Tenant-scoped queries ensure zero cross-pharmacy data exposure',
        'Granular Roles: Super Admin, Pharmacy Owner, Licensed Pharmacist, Counter Cashier, Stock Manager',
        'Permission Guards: Cashiers cannot view sensitive ledger entries or modify purchase invoices',
        'Complete Audit Trail: Track who created, edited, dispensed, or adjusted any item in the system',
      ],
    },
  ];

  // Screenshots gallery
  const screenshots = [
    {
      src: '/screenshots/POS.jpeg',
      title: 'Zero-Mouse POS Kiosk',
      category: 'POS & Billing',
      desc: 'High-speed touch/keyboard checkout with Pakistani loose tablet conversions',
    },
    {
      src: '/screenshots/main-dashboard.jpeg',
      title: 'Executive Analytics Dashboard',
      category: 'Analytics',
      desc: 'Real-time 7-day revenue trend charts, sales analytics, and FEFO expiry radar',
    },
    {
      src: '/screenshots/inventory-engine.jpeg',
      title: 'Inventory & Batch Engine',
      category: 'Inventory',
      desc: 'Batch tracking, expiry status, and stock adjustment workflows',
    },
    {
      src: '/screenshots/accounting-engine.jpeg',
      title: 'Automated Accounting & Ledger',
      category: 'Accounting',
      desc: 'Automated double-entry journal postings, Chart of Accounts, and Trial Balance',
    },
    {
      src: '/screenshots/procurement.jpeg',
      title: 'Procurement & Goods Receipt',
      category: 'Procurement',
      desc: 'Purchase order lifecycle, supplier ledgers, and GRN batch intake',
    },
    {
      src: '/screenshots/access-control.jpeg',
      title: 'Role-Based Access Control',
      category: 'Security',
      desc: 'Granular permissions, multi-tenant isolation, and user role management',
    },
    {
      src: '/screenshots/master-data-management.jpeg',
      title: 'Master Data Management',
      category: 'Master Data',
      desc: 'Manufacturers, categories, packaging units, and dosage master lists',
    },
    {
      src: '/screenshots/medicine-master.jpeg',
      title: 'Medicine Catalog Formulary',
      category: 'Master Data',
      desc: 'Brand names, generic formulas, pricing, and packaging strip setup',
    },
  ];

  // Pricing plans exactly matching user specifications
  const pricingPlans = [
    {
      number: '01',
      name: 'STARTER',
      tagline: 'For independent pharmacies and medical stores',
      badge: 'Entry plan',
      price: 'Rs. 2,999',
      period: '/ month',
      isPopular: false,
      features: [
        '1 pharmacy branch',
        'Up to 3 users',
        '1 POS terminal',
        'Medicine master and catalogue',
        'Inventory and batch management',
        'Procurement and purchase invoices',
        'POS, billing and returns',
        'Supplier and customer ledgers',
        'Basic accounting',
        'Sales and inventory reports',
        'Standard support',
      ],
      ctaText: 'Start Starter Plan',
      ctaLink: '/register?plan=starter',
    },
    {
      number: '02',
      name: 'PROFESSIONAL',
      tagline: 'For established and high-volume pharmacies',
      badge: 'Recommended',
      price: 'Rs. 4,999',
      period: '/ month',
      isPopular: true,
      features: [
        '1 pharmacy branch',
        'Up to 8 users',
        'Up to 3 POS terminals',
        'Everything in Starter',
        'Full accounting and financial reports',
        'Advanced inventory reports',
        'Stock ageing and dead-stock analysis',
        'Expiry exposure reports',
        'Advanced role-based permissions',
        'Audit logs',
        'Priority support',
      ],
      ctaText: 'Start Professional Trial',
      ctaLink: '/register?plan=professional',
    },
    {
      number: '03',
      name: 'BUSINESS',
      tagline: 'For growing pharmacy businesses',
      badge: 'Growing Business',
      price: 'Rs. 9,999',
      period: '/ month',
      isPopular: false,
      features: [
        'Up to 3 branches',
        'Up to 15 users',
        'Multiple POS terminals',
        'Everything in Professional',
        'Centralized management dashboard',
        'Inter-branch stock transfers (when implemented)',
        'Consolidated business reporting (when implemented)',
        'Advanced access controls',
        'Priority onboarding and support',
      ],
      ctaText: 'Start Business Plan',
      ctaLink: '/register?plan=business',
    },
    {
      number: '04',
      name: 'ENTERPRISE',
      tagline: 'For larger pharmacy chains and specialized deployments',
      badge: 'Pharmacy Chains',
      price: 'Custom pricing',
      period: '',
      isPopular: false,
      features: [
        'Custom branch and user limits',
        'Dedicated onboarding',
        'Custom reports and integrations',
        'Data migration assistance',
        'Dedicated support arrangements',
      ],
      ctaText: 'Contact Enterprise Sales',
      ctaLink: '/register?plan=enterprise',
    },
  ];

  // FAQs
  const faqs = [
    {
      q: 'How does Pharmalytics handle Pakistani loose tablet (goli / patta) sales?',
      a: 'Pharmalytics has native unit fractioning built into its core engine. When configuring a medicine, you define strips per box and tablets per strip. At POS, cashiers can sell 1 goli, 2 pattas, or a full dabba. The inventory engine accurately decrements fractional stock and recalculates cost without requiring blister pack breakage write-offs.',
    },
    {
      q: 'Can I use existing hardware (barcode scanners, thermal printers, cash drawers)?',
      a: 'Yes! Pharmalytics runs in standard web browsers and works with standard USB / Bluetooth barcode scanners, 80mm and 58mm thermal receipt printers, and automatic cash drawers. Our Zero-Mouse keyboard shortcuts mean cashiers never even need to reach for a mouse.',
    },
    {
      q: 'How does the FEFO (First-Expiry-First-Out) engine save my pharmacy money?',
      a: 'Expired medicines are one of the biggest profit drains for pharmacies. Pharmalytics automatically assigns the earliest expiring batch when scanning or searching a medicine at POS. Additionally, our Expiry Radar alerts you to batches reaching 30, 60, and 90-day expiry windows so you can return them to distributors for full credit.',
    },
    {
      q: 'Do I need an accountant to run Pharmalytics?',
      a: 'No. Pharmalytics features automated ERP accounting. Every checkout, refund, and purchase receipt automatically generates GAAP double-entry journal entries (e.g. Debit Cash, Credit Sales). Your Chart of Accounts and Trial Balance update automatically in real-time.',
    },
    {
      q: 'Is our pharmacy data secure and private?',
      a: 'Absolutely. Every pharmacy on Pharmalytics is completely partitioned with strict tenant isolation. Furthermore, our Role-Based Access Control (RBAC) ensures your cashiers cannot inspect wholesale purchase prices or owner accounting ledgers.',
    },
  ];

  return (
    <Box style={{ position: 'relative', overflowX: 'hidden' }}>
      {/* ---------------- NAVIGATION BAR ---------------- */}
      <Box className="landing-nav" py={14}>
        <Container size="xl">
          <Group justify="space-between" align="center">
            {/* Logo */}
            <Link href="/" style={{ textDecoration: 'none' }}>
              <Group gap={10} align="center">
                <Box className="brand-mark" style={{ width: 40, height: 40, borderRadius: 10 }}>
                  <IconPill size={22} stroke={2.2} />
                </Box>
                <Box>
                  <Text fw={800} size="lg" style={{ letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                    Pharmalytics
                  </Text>
                  <Text size="10px" c="dimmed" fw={600} style={{ letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    Pharmacy ERP & POS
                  </Text>
                </Box>
              </Group>
            </Link>

            {/* Desktop Navigation Links */}
            <Group gap={28} visibleFrom="md">
              <Link href="#features" style={{ fontSize: 14, fontWeight: 600, color: 'inherit', textDecoration: 'none' }}>
                Features
              </Link>
              <Link href="#tour" style={{ fontSize: 14, fontWeight: 600, color: 'inherit', textDecoration: 'none' }}>
                System Tour
              </Link>
              <Link href="#mobile" style={{ fontSize: 14, fontWeight: 600, color: 'inherit', textDecoration: 'none' }}>
                <Group gap={5}>
                  <span>Mobile App</span>
                  <Badge size="xs" variant="filled" color="teal">Coming Soon</Badge>
                </Group>
              </Link>
              <Link href="#ai-copilot" style={{ fontSize: 14, fontWeight: 600, color: 'inherit', textDecoration: 'none' }}>
                <Group gap={5}>
                  <span>AI Copilot</span>
                  <Badge size="xs" variant="filled" color="violet">Coming Soon</Badge>
                </Group>
              </Link>
              <Link href="#pricing" style={{ fontSize: 14, fontWeight: 600, color: 'inherit', textDecoration: 'none' }}>
                Pricing
              </Link>
              <Link href="#faq" style={{ fontSize: 14, fontWeight: 600, color: 'inherit', textDecoration: 'none' }}>
                FAQ
              </Link>
            </Group>

            {/* Actions & Night Shift Mode */}
            <Group gap={12}>
              <Tooltip label={isDark ? 'Switch to Day Mode' : 'Switch to 24/7 Night Shift Mode'} withArrow>
                <ActionIcon
                  variant="subtle"
                  size="lg"
                  radius="md"
                  color={isDark ? 'teal' : 'gray'}
                  onClick={() => toggleColorScheme()}
                  aria-label="Toggle Night Shift Theme"
                >
                  {isDark ? <IconSun size={20} /> : <IconMoon size={20} />}
                </ActionIcon>
              </Tooltip>

              <Button
                component={Link}
                href="/login"
                variant="subtle"
                color="teal"
                fw={600}
                size="sm"
                visibleFrom="sm"
              >
                Sign In
              </Button>

              <Button
                component={Link}
                href="/register"
                variant="filled"
                color="teal"
                fw={700}
                size="sm"
                radius="md"
                rightSection={<IconArrowRight size={16} />}
              >
                Start Free Trial
              </Button>
            </Group>
          </Group>
        </Container>
      </Box>

      {/* ---------------- HERO SECTION ---------------- */}
      <Box style={{ position: 'relative', paddingTop: 60, paddingBottom: 80 }}>
        <Box className="landing-hero-glow" />

        <Container size="xl" style={{ position: 'relative', zIndex: 1 }}>
          <Stack align="center" gap={20} style={{ textAlign: 'center', maxWidth: 940, margin: '0 auto' }}>
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Badge
                size="lg"
                variant="light"
                color="teal"
                radius="xl"
                py={10}
                px={18}
                leftSection={<IconSparkles size={16} />}
                style={{ textTransform: 'none', fontWeight: 650, fontSize: 13 }}
              >
                Next-Gen Intelligent Pharmacy OS · Designed for Pakistan & Global Pharmacies
              </Badge>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Title
                order={1}
                style={{
                  fontSize: 'clamp(34px, 5.2vw, 62px)',
                  fontWeight: 850,
                  letterSpacing: '-0.04em',
                  lineHeight: 1.1,
                }}
              >
                The Intelligent Operating System for High-Velocity Pharmacies
              </Title>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Text
                size="lg"
                c="dimmed"
                style={{ maxWidth: 740, lineHeight: 1.65, fontSize: 'clamp(16px, 1.8vw, 19px)' }}
              >
                Eliminate stockouts, prevent costly batch expirations, and accelerate sales counter checkouts with
                <strong> Zero-Mouse POS</strong>, native <strong>Goli / Patta / Dabba</strong> loose dispensing, and
                automated <strong>GAAP double-entry accounting</strong>.
              </Text>
            </motion.div>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Group gap={16} mt={10}>
                <Button
                  component={Link}
                  href="/register"
                  size="lg"
                  color="teal"
                  radius="md"
                  fw={750}
                  rightSection={<IconArrowRight size={18} />}
                  style={{ boxShadow: '0 8px 25px rgba(20, 184, 166, 0.35)' }}
                >
                  Start 14-Day Free Trial
                </Button>

                <Button
                  component={Link}
                  href="#tour"
                  size="lg"
                  variant="default"
                  radius="md"
                  fw={600}
                >
                  Explore System Tour
                </Button>
              </Group>
            </motion.div>

            {/* Quick Metrics */}
            <SimpleGrid cols={{ base: 2, sm: 4 }} spacing={20} mt={36} style={{ width: '100%', maxWidth: 860 }}>
              <Paper p={14} radius="md" withBorder style={{ textAlign: 'center' }}>
                <Text fw={800} size="xl" c="teal.7">
                  &lt; 1.5s
                </Text>
                <Text size="xs" c="dimmed" fw={600}>
                  Zero-Mouse Checkout
                </Text>
              </Paper>

              <Paper p={14} radius="md" withBorder style={{ textAlign: 'center' }}>
                <Text fw={800} size="xl" c="teal.7">
                  100% FEFO
                </Text>
                <Text size="xs" c="dimmed" fw={600}>
                  Expiry Defense Radar
                </Text>
              </Paper>

              <Paper p={14} radius="md" withBorder style={{ textAlign: 'center' }}>
                <Text fw={800} size="xl" c="teal.7">
                  Goli / Patta
                </Text>
                <Text size="xs" c="dimmed" fw={600}>
                  Native Loose Dispensing
                </Text>
              </Paper>

              <Paper p={14} radius="md" withBorder style={{ textAlign: 'center' }}>
                <Text fw={800} size="xl" c="teal.7">
                  Automated
                </Text>
                <Text size="xs" c="dimmed" fw={600}>
                  GAAP Double-Entry Ledger
                </Text>
              </Paper>
            </SimpleGrid>
          </Stack>

          {/* Hero Main Browser Screenshot Frame */}
          <Box mt={50} style={{ position: 'relative' }}>
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <Box className="browser-frame" style={{ maxWidth: 1160, margin: '0 auto' }}>
                <Box className="browser-header">
                  <Box className="browser-dots">
                    <Box className="browser-dot" style={{ background: '#ef4444' }} />
                    <Box className="browser-dot" style={{ background: '#f59e0b' }} />
                    <Box className="browser-dot" style={{ background: '#10b981' }} />
                  </Box>
                  <Box className="browser-url-bar">https://app.pharmalytics.com/dashboard</Box>
                </Box>
                <Box style={{ position: 'relative', width: '100%', height: 'auto', maxHeight: 620, overflow: 'hidden' }}>
                  <Image
                    src="/screenshots/main-dashboard.jpeg"
                    alt="Pharmalytics Executive Dashboard"
                    width={1840}
                    height={1080}
                    priority
                    style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'cover' }}
                  />
                </Box>
              </Box>
            </motion.div>
          </Box>
        </Container>
      </Box>

      {/* ---------------- INTERACTIVE ANIMATED FEATURES ---------------- */}
      <Box id="features" py={80} style={{ borderTop: '1px solid var(--line)', background: isDark ? '#0c101d' : '#fcfdfd' }}>
        <Container size="xl">
          <Stack align="center" gap={12} mb={45} style={{ textAlign: 'center' }}>
            <Badge size="lg" variant="light" color="teal">
              All Implemented Modules
            </Badge>
            <Title order={2} style={{ fontSize: 'clamp(28px, 3.5vw, 42px)', fontWeight: 800, letterSpacing: '-0.03em' }}>
              Built from the Ground Up for Real Pharmacy Operations
            </Title>
            <Text c="dimmed" size="md" style={{ maxWidth: 700 }}>
              Every feature has been meticulously crafted to solve daily retail and wholesale pharmacy bottlenecks.
              Click below to explore each module in action.
            </Text>
          </Stack>

          {/* Feature Selector Tabs */}
          <Tabs
            value={activeFeatureTab}
            onChange={(val) => val && setActiveFeatureTab(val)}
            variant="pills"
            color="teal"
            radius="md"
          >
            <Tabs.List justify="center" mb={35} style={{ gap: 8, flexWrap: 'wrap' }}>
              {coreFeatures.map((feat) => {
                const IconComponent = feat.icon;
                return (
                  <Tabs.Tab
                    key={feat.id}
                    value={feat.id}
                    leftSection={<IconComponent size={18} />}
                    style={{ fontWeight: 650, fontSize: 13, padding: '10px 18px' }}
                  >
                    {feat.label}
                  </Tabs.Tab>
                );
              })}
            </Tabs.List>

            {/* Active Tab Animated Content */}
            <AnimatePresence mode="wait">
              {coreFeatures.map((feat) => {
                if (feat.id !== activeFeatureTab) return null;
                const IconComponent = feat.icon;

                return (
                  <motion.div
                    key={feat.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.35 }}
                  >
                    <Grid gutter={40} align="center">
                      {/* Left: Text & Key Highlights */}
                      <Grid.Col span={{ base: 12, md: 5 }}>
                        <Stack gap={16}>
                          <Group gap={8}>
                            <ThemeIcon size="lg" radius="md" color="teal" variant="light">
                              <IconComponent size={22} />
                            </ThemeIcon>
                            <Badge color="teal" variant="outline" size="sm">
                              {feat.badge}
                            </Badge>
                          </Group>

                          <Title order={3} style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                            {feat.title}
                          </Title>

                          <Text c="dimmed" style={{ lineHeight: 1.6, fontSize: 15 }}>
                            {feat.description}
                          </Text>

                          <Paper p={14} radius="md" withBorder style={{ background: isDark ? '#14202d' : '#f0fdf9', borderColor: '#99f6e4' }}>
                            <Group gap={10} align="flex-start">
                              <IconBolt size={20} color="#0d9488" style={{ flexShrink: 0, marginTop: 2 }} />
                              <Text size="sm" fw={600} c={isDark ? 'teal.2' : 'teal.9'}>
                                {feat.highlight}
                              </Text>
                            </Group>
                          </Paper>

                          <Divider my={6} />

                          <Stack gap={10}>
                            {feat.points.map((pt, idx) => (
                              <Group key={idx} gap={10} align="flex-start">
                                <ThemeIcon size="sm" radius="xl" color="teal" variant="filled" style={{ marginTop: 3 }}>
                                  <IconCheck size={12} stroke={3} />
                                </ThemeIcon>
                                <Text size="sm" fw={550} style={{ flex: 1 }}>
                                  {pt}
                                </Text>
                              </Group>
                            ))}
                          </Stack>

                          <Group mt={10}>
                            <Button
                              component={Link}
                              href="/register"
                              color="teal"
                              variant="filled"
                              rightSection={<IconArrowRight size={16} />}
                            >
                              Experience {feat.label}
                            </Button>
                          </Group>
                        </Stack>
                      </Grid.Col>

                      {/* Right: Actual Application Screenshot in Browser Frame */}
                      <Grid.Col span={{ base: 12, md: 7 }}>
                        <Box
                          className="browser-frame"
                          style={{ cursor: 'pointer' }}
                          onClick={() => {
                            setSelectedScreenshot({
                              src: feat.image,
                              title: feat.title,
                              desc: feat.description,
                            });
                            openLightbox();
                          }}
                        >
                          <Box className="browser-header">
                            <Box className="browser-dots">
                              <Box className="browser-dot" style={{ background: '#ef4444' }} />
                              <Box className="browser-dot" style={{ background: '#f59e0b' }} />
                              <Box className="browser-dot" style={{ background: '#10b981' }} />
                            </Box>
                            <Box className="browser-url-bar">https://app.pharmalytics.com/{feat.id}</Box>
                            <Badge size="xs" variant="light" color="teal">Click to Zoom</Badge>
                          </Box>
                          <Box style={{ position: 'relative', width: '100%', height: 'auto', overflow: 'hidden' }}>
                            <Image
                              src={feat.image}
                              alt={feat.title}
                              width={1600}
                              height={980}
                              style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'contain' }}
                            />
                          </Box>
                        </Box>
                      </Grid.Col>
                    </Grid>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </Tabs>
        </Container>
      </Box>

      {/* ---------------- SYSTEM TOUR & SCREENSHOT SHOWCASE ---------------- */}
      <Box id="tour" py={80}>
        <Container size="xl">
          <Stack align="center" gap={12} mb={45} style={{ textAlign: 'center' }}>
            <Badge size="lg" variant="light" color="teal">
              System Tour
            </Badge>
            <Title order={2} style={{ fontSize: 'clamp(28px, 3.5vw, 42px)', fontWeight: 800, letterSpacing: '-0.03em' }}>
              Inspect the Live Production Interface
            </Title>
            <Text c="dimmed" size="md" style={{ maxWidth: 680 }}>
              Explore the actual screenshots of Pharmalytics in action. Every screen is designed for high efficiency,
              zero latency, and immediate clarity.
            </Text>
          </Stack>

          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing={20}>
            {screenshots.map((s, idx) => (
              <Card
                key={idx}
                padding="xs"
                radius="md"
                withBorder
                style={{
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                }}
                className="feature-pill-badge"
                onClick={() => {
                  setSelectedScreenshot(s);
                  openLightbox();
                }}
              >
                <Card.Section>
                  <Box style={{ position: 'relative', height: 180, overflow: 'hidden', background: '#0f172a' }}>
                    <Image
                      src={s.src}
                      alt={s.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 300px"
                      style={{ objectFit: 'cover' }}
                    />
                  </Box>
                </Card.Section>

                <Stack gap={4} p={10}>
                  <Group justify="space-between" align="center">
                    <Badge size="xs" variant="light" color="teal">
                      {s.category}
                    </Badge>
                    <Text size="10px" c="dimmed">Click to Expand</Text>
                  </Group>
                  <Text fw={700} size="sm" lineClamp={1}>
                    {s.title}
                  </Text>
                  <Text size="xs" c="dimmed" lineClamp={2}>
                    {s.desc}
                  </Text>
                </Stack>
              </Card>
            ))}
          </SimpleGrid>
        </Container>
      </Box>

      {/* ---------------- MOBILE APPLICATION SECTION (COMING SOON) ---------------- */}
      <Box id="mobile" py={80} style={{ borderTop: '1px solid var(--line)', background: isDark ? '#0c101d' : '#f8fafc' }}>
        <Container size="xl">
          <Paper
            radius="xl"
            p={{ base: 28, md: 50 }}
            withBorder
            style={{
              position: 'relative',
              overflow: 'hidden',
              background: isDark
                ? 'linear-gradient(135deg, #0e1726 0%, #090e17 100%)'
                : 'linear-gradient(135deg, #ffffff 0%, #f0fdfa 100%)',
              borderColor: '#14b8a6',
            }}
          >
            <Grid gutter={40} align="center">
              {/* Left Column: Details & Coming Soon Badge */}
              <Grid.Col span={{ base: 12, md: 7 }}>
                <Stack gap={18}>
                  <Group gap={10}>
                    <Badge
                      size="lg"
                      variant="filled"
                      color="teal"
                      className="pulse-badge"
                      style={{ padding: '8px 16px', fontWeight: 700 }}
                    >
                      🚀 Mobile App · Coming Soon
                    </Badge>
                    <Badge size="lg" variant="light" color="blue">
                      iOS & Android
                    </Badge>
                  </Group>

                  <Title order={2} style={{ fontSize: 'clamp(28px, 3.5vw, 44px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15 }}>
                    Your Entire Pharmacy in the Palm of Your Hand
                  </Title>

                  <Text c="dimmed" size="md" style={{ lineHeight: 1.65 }}>
                    Never be tied to your desk again. Monitor live branch revenues, conduct shelf-side physical stock
                    audits with your phone camera, and receive instant push notifications whenever high-value batches
                    approach expiration.
                  </Text>

                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing={14} mt={6}>
                    <Group gap={10} align="flex-start">
                      <ThemeIcon size="md" radius="md" color="teal" variant="light">
                        <IconScan size={18} />
                      </ThemeIcon>
                      <Box>
                        <Text fw={700} size="sm">Camera Barcode Scanner</Text>
                        <Text size="xs" c="dimmed">Scan barcodes on shelves without desktop hardware</Text>
                      </Box>
                    </Group>

                    <Group gap={10} align="flex-start">
                      <ThemeIcon size="md" radius="md" color="teal" variant="light">
                        <IconChartBar size={18} />
                      </ThemeIcon>
                      <Box>
                        <Text fw={700} size="sm">Live Owner Dashboard</Text>
                        <Text size="xs" c="dimmed">Real-time sales, cash drawer totals, and profit metrics</Text>
                      </Box>
                    </Group>

                    <Group gap={10} align="flex-start">
                      <ThemeIcon size="md" radius="md" color="teal" variant="light">
                        <IconClock size={18} />
                      </ThemeIcon>
                      <Box>
                        <Text fw={700} size="sm">Expiry Push Alerts</Text>
                        <Text size="xs" c="dimmed">Instant warnings for batches reaching 30-day thresholds</Text>
                      </Box>
                    </Group>

                    <Group gap={10} align="flex-start">
                      <ThemeIcon size="md" radius="md" color="teal" variant="light">
                        <IconBuildingStore size={18} />
                      </ThemeIcon>
                      <Box>
                        <Text fw={700} size="sm">Multi-Branch Telemetry</Text>
                        <Text size="xs" c="dimmed">Switch between branches instantly from your pocket</Text>
                      </Box>
                    </Group>
                  </SimpleGrid>

                  {/* App Store Buttons (Coming Soon) */}
                  <Group gap={16} mt={14}>
                    <Button
                      size="lg"
                      variant="default"
                      radius="md"
                      leftSection={<IconBrandGooglePlay size={22} />}
                      onClick={() => {
                        setWaitlistType('mobile');
                        openWaitlist();
                      }}
                      style={{ height: 50 }}
                    >
                      <Box style={{ textAlign: 'left' }}>
                        <Text size="9px" c="dimmed" fw={600} style={{ textTransform: 'uppercase' }}>Available Soon on</Text>
                        <Text size="sm" fw={700}>Google Play Store</Text>
                      </Box>
                    </Button>

                    <Button
                      size="lg"
                      variant="default"
                      radius="md"
                      leftSection={<IconBrandApple size={24} />}
                      onClick={() => {
                        setWaitlistType('mobile');
                        openWaitlist();
                      }}
                      style={{ height: 50 }}
                    >
                      <Box style={{ textAlign: 'left' }}>
                        <Text size="9px" c="dimmed" fw={600} style={{ textTransform: 'uppercase' }}>Available Soon on</Text>
                        <Text size="sm" fw={700}>Apple App Store</Text>
                      </Box>
                    </Button>
                  </Group>
                </Stack>
              </Grid.Col>

              {/* Right Column: Visual Mockup */}
              <Grid.Col span={{ base: 12, md: 5 }}>
                <Center>
                  <Paper
                    p={20}
                    radius="32px"
                    withBorder
                    style={{
                      width: '100%',
                      maxWidth: 320,
                      background: isDark ? '#0b0f19' : '#ffffff',
                      boxShadow: '0 25px 60px -15px rgba(20, 184, 166, 0.25)',
                      border: '6px solid ' + (isDark ? '#1e293b' : '#0f172a'),
                    }}
                  >
                    {/* Simulated Phone Screen */}
                    <Stack gap={14}>
                      <Group justify="space-between" align="center">
                        <Group gap={6}>
                          <Box className="brand-mark" style={{ width: 26, height: 26, borderRadius: 6 }}>
                            <IconPill size={14} />
                          </Box>
                          <Text fw={750} size="xs">Pharmalytics Mobile</Text>
                        </Group>
                        <Badge size="xs" color="teal">LIVE</Badge>
                      </Group>

                      <Paper p={12} radius="md" style={{ background: isDark ? '#141e2e' : '#f0fdf4' }}>
                        <Text size="10px" c="dimmed" fw={600}>TODAY&apos;S TOTAL SALES</Text>
                        <Text size="xl" fw={800} c="teal">Rs. 184,250</Text>
                        <Text size="10px" c="teal.7" fw={600}>↑ +14.2% from yesterday</Text>
                      </Paper>

                      <Paper p={10} radius="md" withBorder>
                        <Group justify="space-between">
                          <Text size="xs" fw={700}>POS Cashier 01</Text>
                          <Badge size="xs" color="green">Active</Badge>
                        </Group>
                        <Text size="11px" c="dimmed">64 receipts · Ali Khan</Text>
                      </Paper>

                      <Paper p={10} radius="md" withBorder>
                        <Group justify="space-between">
                          <Text size="xs" fw={700}>Expiry Warning</Text>
                          <Badge size="xs" color="red">30 Days</Badge>
                        </Group>
                        <Text size="11px" c="dimmed">Augmentin 625mg (28 strips)</Text>
                      </Paper>

                      <Button
                        size="xs"
                        fullWidth
                        color="teal"
                        leftSection={<IconScan size={14} />}
                        onClick={() => {
                          setWaitlistType('mobile');
                          openWaitlist();
                        }}
                      >
                        Open Camera Barcode Scanner
                      </Button>
                    </Stack>
                  </Paper>
                </Center>
              </Grid.Col>
            </Grid>
          </Paper>
        </Container>
      </Box>

      {/* ---------------- CUSTOMIZED AI CHATBOT COPILOT (COMING SOON) ---------------- */}
      <Box id="ai-copilot" py={80} style={{ borderTop: '1px solid var(--line)' }}>
        <Container size="xl">
          <Paper
            radius="xl"
            p={{ base: 28, md: 50 }}
            withBorder
            style={{
              position: 'relative',
              overflow: 'hidden',
              background: isDark
                ? 'linear-gradient(135deg, #101426 0%, #0d0f1a 100%)'
                : 'linear-gradient(135deg, #fdf4ff 0%, #faf5ff 50%, #f0fdfa 100%)',
              borderColor: '#a855f7',
            }}
          >
            <Grid gutter={40} align="center">
              {/* Left Column: AI Interactive Mockup */}
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Paper
                  p={22}
                  radius="lg"
                  withBorder
                  style={{
                    background: isDark ? '#0b0f19' : '#ffffff',
                    boxShadow: '0 20px 45px -10px rgba(168, 85, 247, 0.25)',
                  }}
                >
                  <Group justify="space-between" mb={16} pb={12} style={{ borderBottom: '1px solid var(--line)' }}>
                    <Group gap={10}>
                      <ThemeIcon size="lg" radius="md" color="grape" variant="filled">
                        <IconRobot size={22} />
                      </ThemeIcon>
                      <Box>
                        <Text fw={750} size="sm">Pharmalytics AI Copilot</Text>
                        <Text size="10px" c="dimmed">Trained on Clinical Formularies & ERP Telemetry</Text>
                      </Box>
                    </Group>
                    <Badge size="sm" variant="light" color="grape">
                      Autonomous Pharmacist AI
                    </Badge>
                  </Group>

                  {/* Simulated Chat Messages */}
                  <Stack gap={12}>
                    {/* User Question 1 */}
                    <Box style={{ alignSelf: 'flex-end', maxWidth: '85%' }}>
                      <Paper p={10} radius="md" style={{ background: '#7c3aed', color: '#ffffff' }}>
                        <Text size="xs" fw={500}>
                          Which antibiotic batches expire in the next 45 days and how much cash is locked in them?
                        </Text>
                      </Paper>
                      <Text size="9px" c="dimmed" style={{ textAlign: 'right', marginTop: 3 }}>
                        Pharmacist · Just now
                      </Text>
                    </Box>

                    {/* AI Answer 1 */}
                    <Box style={{ alignSelf: 'flex-start', maxWidth: '90%' }}>
                      <Paper
                        p={12}
                        radius="md"
                        withBorder
                        style={{
                          background: isDark ? '#141828' : '#f8fafc',
                          borderColor: isDark ? '#2e354f' : '#e2e8f0',
                        }}
                      >
                        <Group gap={6} mb={4}>
                          <IconSparkles size={14} color="#a855f7" />
                          <Text size="xs" fw={700} c="grape">
                            AI Copilot Response:
                          </Text>
                        </Group>
                        <Text size="xs" style={{ lineHeight: 1.5 }}>
                          Found <strong>2 critical batches</strong> totaling <strong>Rs. 32,450</strong> at cost:
                        </Text>
                        <Box my={6} pl={10} style={{ borderLeft: '2px solid #a855f7' }}>
                          <Text size="11px">
                            1. <strong>Augmentin 625mg</strong> (Batch #AG-882, 28 strips) · Expires in 34 days
                          </Text>
                          <Text size="11px">
                            2. <strong>Ciproxin 500mg</strong> (Batch #CP-104, 15 strips) · Expires in 41 days
                          </Text>
                        </Box>
                        <Text size="11px" c="dimmed">
                          💡 <strong>Action:</strong> Auto-generate vendor return invoice to Getz Pharma for full credit?
                        </Text>
                      </Paper>
                    </Box>

                    {/* User Question 2 */}
                    <Box style={{ alignSelf: 'flex-end', maxWidth: '85%' }}>
                      <Paper p={10} radius="md" style={{ background: '#7c3aed', color: '#ffffff' }}>
                        <Text size="xs" fw={500}>
                          Can Panadol CF and Coldrex be safely co-dispensed to an adult?
                        </Text>
                      </Paper>
                    </Box>

                    {/* AI Answer 2 */}
                    <Box style={{ alignSelf: 'flex-start', maxWidth: '90%' }}>
                      <Paper
                        p={12}
                        radius="md"
                        withBorder
                        style={{
                          background: isDark ? '#25151b' : '#fff1f2',
                          borderColor: '#fda4af',
                        }}
                      >
                        <Group gap={6} mb={2}>
                          <Text size="xs" fw={700} c="red">
                            ⚠️ CLINICAL CONTRAINDICATION:
                          </Text>
                        </Group>
                        <Text size="xs" c={isDark ? 'red.2' : 'red.9'} style={{ lineHeight: 1.45 }}>
                          <strong>Do not co-dispense.</strong> Both drugs contain Paracetamol (Acetaminophen) leading to toxic hepatotoxicity risk. Advise patient to select one formulation.
                        </Text>
                      </Paper>
                    </Box>
                  </Stack>
                </Paper>
              </Grid.Col>

              {/* Right Column: AI Feature Description */}
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Stack gap={18}>
                  <Group gap={10}>
                    <Badge
                      size="lg"
                      variant="filled"
                      color="grape"
                      className="pulse-badge"
                      style={{ padding: '8px 16px', fontWeight: 700 }}
                    >
                      ✨ Customized AI Chatbot · Coming Soon
                    </Badge>
                  </Group>

                  <Title order={2} style={{ fontSize: 'clamp(28px, 3.5vw, 44px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15 }}>
                    An Intelligent Clinical & Financial Pharmacist in Your Corner
                  </Title>

                  <Text c="dimmed" size="md" style={{ lineHeight: 1.65 }}>
                    Meet the world&apos;s first conversational AI model fine-tuned directly on pharmaceutical formularies
                    and your pharmacy&apos;s real-time inventory ledger. Ask natural questions, detect dangerous drug
                    interactions at the counter, and automate restocking orders in plain Urdu or English.
                  </Text>

                  <Stack gap={12} mt={6}>
                    <Group gap={10} align="flex-start">
                      <ThemeIcon size="md" radius="md" color="grape" variant="light">
                        <IconSparkles size={18} />
                      </ThemeIcon>
                      <Box>
                        <Text fw={700} size="sm">Real-time Clinical Interaction Guards</Text>
                        <Text size="xs" c="dimmed">Detect dangerous drug-drug interactions, duplicate therapies, and dosage contraindications</Text>
                      </Box>
                    </Group>

                    <Group gap={10} align="flex-start">
                      <ThemeIcon size="md" radius="md" color="grape" variant="light">
                        <IconMessageDots size={18} />
                      </ThemeIcon>
                      <Box>
                        <Text fw={700} size="sm">Conversational ERP Queries</Text>
                        <Text size="xs" c="dimmed">Ask &quot;What was our net margin on cardiac medicines this week?&quot; and receive instant figures</Text>
                      </Box>
                    </Group>

                    <Group gap={10} align="flex-start">
                      <ThemeIcon size="md" radius="md" color="grape" variant="light">
                        <IconPackages size={18} />
                      </ThemeIcon>
                      <Box>
                        <Text fw={700} size="sm">Predictive Seasonal Restocking</Text>
                        <Text size="xs" c="dimmed">Forecast antibiotic surges before allergy or viral seasons based on historical sales velocity</Text>
                      </Box>
                    </Group>
                  </Stack>

                  <Group mt={14}>
                    <Button
                      size="lg"
                      color="grape"
                      radius="md"
                      fw={700}
                      rightSection={<IconArrowRight size={18} />}
                      onClick={() => {
                        setWaitlistType('ai');
                        openWaitlist();
                      }}
                      style={{ boxShadow: '0 8px 25px rgba(168, 85, 247, 0.35)' }}
                    >
                      Join AI Copilot Beta Waitlist
                    </Button>
                  </Group>
                </Stack>
              </Grid.Col>
            </Grid>
          </Paper>
        </Container>
      </Box>

      {/* ---------------- PRICING PLANS ---------------- */}
      <Box id="pricing" py={80} style={{ borderTop: '1px solid var(--line)', background: isDark ? '#0c101d' : '#fcfdfd' }}>
        <Container size="xl">
          <Stack align="center" gap={12} mb={50} style={{ textAlign: 'center' }}>
            <Badge size="lg" variant="light" color="teal">
              Transparent Pricing Plans
            </Badge>
            <Title order={2} style={{ fontSize: 'clamp(28px, 3.5vw, 42px)', fontWeight: 800, letterSpacing: '-0.03em' }}>
              Predictable, Scalable Plans for Every Pharmacy Size
            </Title>
            <Text c="dimmed" size="md" style={{ maxWidth: 680 }}>
              From single medical stores to growing pharmacy networks. No hidden setup fees or terminal lock-in.
            </Text>
          </Stack>

          <SimpleGrid cols={{ base: 1, md: 2, lg: 4 }} spacing={24} align="stretch">
            {pricingPlans.map((plan) => (
              <Card
                key={plan.number}
                radius="lg"
                p={24}
                withBorder
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  background: plan.isPopular
                    ? isDark
                      ? '#131e2e'
                      : '#ffffff'
                    : 'inherit',
                  borderColor: plan.isPopular ? '#14b8a6' : undefined,
                  boxShadow: plan.isPopular
                    ? '0 15px 35px -5px rgba(20, 184, 166, 0.25)'
                    : undefined,
                  borderWidth: plan.isPopular ? 2 : 1,
                }}
              >
                {/* Popular Badge */}
                {plan.isPopular && (
                  <Badge
                    color="teal"
                    variant="filled"
                    size="sm"
                    radius="xl"
                    style={{
                      position: 'absolute',
                      top: -12,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      fontWeight: 800,
                    }}
                  >
                    Recommended
                  </Badge>
                )}

                {/* Plan Header */}
                <Box mb={14}>
                  <Text size="xs" fw={700} c="dimmed" style={{ letterSpacing: '0.1em' }}>
                    {plan.number} · {plan.name}
                  </Text>
                  <Text size="xs" c="dimmed" mt={4} style={{ minHeight: 36 }}>
                    {plan.tagline}
                  </Text>
                </Box>

                {/* Price Display */}
                <Box my={12}>
                  <Group gap={4} align="baseline">
                    <Text
                      fw={850}
                      style={{
                        fontSize: plan.price.includes('Custom') ? 28 : 34,
                        letterSpacing: '-0.03em',
                      }}
                    >
                      {plan.price}
                    </Text>
                    {plan.period && (
                      <Text size="sm" c="dimmed" fw={600}>
                        {plan.period}
                      </Text>
                    )}
                  </Group>
                </Box>

                <Divider my={12} />

                {/* Feature List */}
                <Stack gap={10} style={{ flexGrow: 1 }} mb={24}>
                  {plan.features.map((feature, fIdx) => (
                    <Group key={fIdx} gap={10} align="flex-start">
                      <ThemeIcon
                        size={18}
                        radius="xl"
                        color={plan.isPopular ? 'teal' : 'gray'}
                        variant={plan.isPopular ? 'filled' : 'light'}
                        style={{ marginTop: 2 }}
                      >
                        <IconCheck size={12} stroke={3} />
                      </ThemeIcon>
                      <Text size="xs" fw={500} style={{ flex: 1, lineHeight: 1.45 }}>
                        {feature}
                      </Text>
                    </Group>
                  ))}
                </Stack>

                {/* CTA Button */}
                <Button
                  component={Link}
                  href={plan.ctaLink}
                  fullWidth
                  size="md"
                  radius="md"
                  color="teal"
                  variant={plan.isPopular ? 'filled' : 'outline'}
                  fw={700}
                >
                  {plan.ctaText}
                </Button>
              </Card>
            ))}
          </SimpleGrid>
        </Container>
      </Box>

      {/* ---------------- FREQUENTLY ASKED QUESTIONS (FAQ) ---------------- */}
      <Box id="faq" py={80} style={{ borderTop: '1px solid var(--line)' }}>
        <Container size="md">
          <Stack align="center" gap={12} mb={45} style={{ textAlign: 'center' }}>
            <Badge size="lg" variant="light" color="teal">
              Got Questions?
            </Badge>
            <Title order={2} style={{ fontSize: 'clamp(28px, 3.5vw, 40px)', fontWeight: 800, letterSpacing: '-0.03em' }}>
              Frequently Asked Questions
            </Title>
            <Text c="dimmed" size="md">
              Everything you need to know about switching your pharmacy to Pharmalytics.
            </Text>
          </Stack>

          <Stack gap={16}>
            {faqs.map((faq, idx) => (
              <Paper key={idx} p={22} radius="md" withBorder>
                <Group gap={10} align="flex-start" mb={8}>
                  <ThemeIcon size="md" radius="md" color="teal" variant="light">
                    <IconHelpCircle size={18} />
                  </ThemeIcon>
                  <Text fw={750} size="md" style={{ flex: 1, letterSpacing: '-0.01em' }}>
                    {faq.q}
                  </Text>
                </Group>
                <Text size="sm" c="dimmed" style={{ lineHeight: 1.65, paddingLeft: 38 }}>
                  {faq.a}
                </Text>
              </Paper>
            ))}
          </Stack>
        </Container>
      </Box>

      {/* ---------------- FINAL CALL TO ACTION ---------------- */}
      <Box py={80} style={{ borderTop: '1px solid var(--line)', background: isDark ? '#090e18' : '#e0f2ed' }}>
        <Container size="md">
          <Stack align="center" gap={20} style={{ textAlign: 'center' }}>
            <Title order={2} style={{ fontSize: 'clamp(30px, 4vw, 48px)', fontWeight: 850, letterSpacing: '-0.03em' }}>
              Ready to Upgrade Your Pharmacy Operations?
            </Title>
            <Text c="dimmed" size="lg" style={{ maxWidth: 600, lineHeight: 1.6 }}>
              Join forward-thinking pharmacies operating with zero latency, zero loose-tablet shrinkage, and complete
              peace of mind.
            </Text>

            <Group gap={16} mt={10}>
              <Button
                component={Link}
                href="/register"
                size="lg"
                color="teal"
                radius="md"
                fw={750}
                rightSection={<IconArrowRight size={18} />}
                style={{ boxShadow: '0 8px 25px rgba(20, 184, 166, 0.35)' }}
              >
                Create Your Account Now
              </Button>
              <Button
                component={Link}
                href="/login"
                size="lg"
                variant="default"
                radius="md"
                fw={600}
              >
                Sign In to Existing Branch
              </Button>
            </Group>
          </Stack>
        </Container>
      </Box>

      {/* ---------------- FOOTER ---------------- */}
      <Box py={45} style={{ borderTop: '1px solid var(--line)', background: isDark ? '#060910' : '#ffffff' }}>
        <Container size="xl">
          <Group justify="space-between" align="center" style={{ flexWrap: 'wrap', gap: 20 }}>
            <Group gap={10} align="center">
              <Box className="brand-mark" style={{ width: 34, height: 34, borderRadius: 8 }}>
                <IconPill size={18} stroke={2.2} />
              </Box>
              <Box>
                <Text fw={800} size="sm">Pharmalytics</Text>
                <Text size="10px" c="dimmed">© {new Date().getFullYear()} Pharmalytics Inc. All rights reserved.</Text>
              </Box>
            </Group>

            <Group gap={24} style={{ fontSize: 13, color: 'var(--muted)' }}>
              <Link href="#features">Features</Link>
              <Link href="#tour">System Tour</Link>
              <Link href="#mobile">Mobile Apps</Link>
              <Link href="#ai-copilot">AI Copilot</Link>
              <Link href="#pricing">Pricing</Link>
              <Link href="/login">Portal Login</Link>
            </Group>
          </Group>
        </Container>
      </Box>

      {/* ---------------- SCREENSHOT LIGHTBOX MODAL ---------------- */}
      <Modal
        opened={lightboxOpened}
        onClose={closeLightbox}
        size="85%"
        radius="lg"
        title={
          <Group gap={10}>
            <Text fw={750} size="md">{selectedScreenshot.title}</Text>
            <Badge size="xs" color="teal">Full Resolution Preview</Badge>
          </Group>
        }
      >
        <Stack gap={14}>
          <Text size="xs" c="dimmed">{selectedScreenshot.desc}</Text>
          <Box
            style={{
              position: 'relative',
              width: '100%',
              borderRadius: 8,
              overflow: 'hidden',
              background: '#090d16',
            }}
          >
            <Image
              src={selectedScreenshot.src}
              alt={selectedScreenshot.title}
              width={1920}
              height={1080}
              style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'contain' }}
            />
          </Box>
        </Stack>
      </Modal>

      {/* ---------------- MOBILE & AI WAITLIST NOTIFICATION MODAL ---------------- */}
      <Modal
        opened={waitlistModalOpened}
        onClose={() => {
          closeWaitlist();
          setWaitlistSuccess(false);
        }}
        size="md"
        radius="lg"
        title={
          <Group gap={8}>
            {waitlistType === 'mobile' ? <IconDeviceMobile size={20} color="#0d9488" /> : <IconRobot size={20} color="#7c3aed" />}
            <Text fw={750} size="md">
              {waitlistType === 'mobile' ? 'Mobile App Early Access' : 'AI Pharmacy Copilot Waitlist'}
            </Text>
          </Group>
        }
      >
        <Stack gap={16}>
          {waitlistSuccess ? (
            <Paper p={20} radius="md" style={{ background: '#f0fdf4', textAlign: 'center' }}>
              <ThemeIcon size="xl" radius="xl" color="teal" variant="light" mb={10}>
                <IconCheck size={28} />
              </ThemeIcon>
              <Text fw={750} size="md" c="teal.9">You&apos;re on the priority waitlist!</Text>
              <Text size="xs" c="dimmed" mt={4}>
                We&apos;ll notify you the moment the beta download builds are ready for your device.
              </Text>
            </Paper>
          ) : (
            <>
              <Text size="sm" c="dimmed">
                {waitlistType === 'mobile'
                  ? 'Be among the first pharmacy owners to test Pharmalytics on Android & iOS. Enter your email to receive direct invitation links.'
                  : 'Get exclusive access to the fine-tuned pharmaceutical AI Copilot for clinical safety checks and natural language ERP intelligence.'}
              </Text>

              <Button
                color={waitlistType === 'mobile' ? 'teal' : 'grape'}
                fullWidth
                size="md"
                radius="md"
                onClick={() => setWaitlistSuccess(true)}
              >
                Notify Me When Launched
              </Button>
            </>
          )}
        </Stack>
      </Modal>
    </Box>
  );
}
