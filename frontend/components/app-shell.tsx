'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ActionIcon,
  Avatar,
  Badge,
  Button,
  Center,
  Group,
  Loader,
  Menu,
  Text,
  Tooltip,
} from '@mantine/core';
import {
  IconActivityHeartbeat,
  IconArrowLeft,
  IconBuildingStore,
  IconChartBar,
  IconChevronDown,
  IconClipboardList,
  IconCoins,
  IconLayoutDashboard,
  IconLogout,
  IconMaximize,
  IconMedicalCross,
  IconMinimize,
  IconPackage,
  IconReceipt,
  IconUsers,
} from '@tabler/icons-react';
import { logout as logoutApi } from '@/features/auth/api';
import { useAuthStore } from '@/stores/auth-store';

const allNavigation = [
  { label: 'Overview', href: '/dashboard', icon: IconLayoutDashboard, requiredPermission: null },
  { label: 'Medicines', href: '/medicines', icon: IconMedicalCross, requiredPermission: 'catalog.view' },
  { label: 'Categories', href: '/categories', icon: IconPackage, requiredPermission: 'catalog.view' },
  { label: 'Master Data', href: '/master-data', icon: IconBuildingStore, requiredPermission: 'master_data.view' },
  { label: 'Inventory Engine', href: '/inventory', icon: IconActivityHeartbeat, requiredPermission: 'inventory.view' },
  { label: 'Procurement', href: '/procurement', icon: IconClipboardList, requiredPermission: 'procurement.view' },
  { label: 'POS & Counter', href: '/sales', icon: IconReceipt, requiredPermission: 'sales.view' },
  { label: 'Accounting', href: '/accounting', icon: IconCoins, requiredPermission: 'accounting.view' },
  { label: 'Analytics & Reports', href: '/reports', icon: IconChartBar, requiredPermission: 'accounting.view' },
  { label: 'Staff & Roles', href: '/staff', icon: IconUsers, requiredPermission: null, ownerOnly: true },
];

export function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const { accessToken, user, tenantId, tenants, clearSession, switchTenant } = useAuthStore();
  const [hasMounted, setHasMounted] = useState(false);
  const [isKioskActive, setIsKioskActive] = useState(false);
  const [isBrowserFullscreen, setIsBrowserFullscreen] = useState(false);

  const isCashier = Boolean(user?.roles?.includes('cashier'));
  const isOwnerOrAdmin = Boolean(user?.roles?.includes('owner') || user?.roles?.includes('admin'));

  // Role guard: cashiers are strictly locked to /sales
  useEffect(() => {
    setHasMounted(true);
    if (!accessToken) {
      router.replace('/login');
      return;
    }

    if (isCashier && pathname !== '/sales') {
      router.replace('/sales');
    }
  }, [accessToken, isCashier, pathname, router]);

  // Track browser native fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsBrowserFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleBrowserFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const currentTenant = tenants.find((t) => t.id === tenantId);

  const handleLogout = async () => {
    try {
      await logoutApi();
    } catch {
      // Ignore network failure on logout
    } finally {
      clearSession();
      router.replace('/login');
    }
  };

  if (!hasMounted || !accessToken) {
    return (
      <Center style={{ height: '100vh', width: '100vw', background: '#0e1716' }}>
        <Loader color="teal" type="dots" size="lg" />
      </Center>
    );
  }

  // Determine if full-screen Kiosk mode is active (always true for cashier on /sales, or toggled by admin on /sales)
  const isPosPage = pathname === '/sales';
  const showKioskMode = isCashier || (isPosPage && isKioskActive);

  // Filter navigation items based on user permissions and ownership
  const filteredNavigation = allNavigation.filter((item: any) => {
    if (isCashier) return item.href === '/sales';
    if (item.ownerOnly) return isOwnerOrAdmin;
    if (!item.requiredPermission) return true;
    if (isOwnerOrAdmin) return true;
    return user?.permissions?.includes(item.requiredPermission);
  });

  return (
    <div
      className="app-frame"
      style={{
        gridTemplateColumns: showKioskMode ? '1fr' : '248px minmax(0, 1fr)',
        minHeight: '100vh',
      }}
    >
      {/* Sidebar (Hidden in Kiosk / Cashier Full-Screen Mode) */}
      {!showKioskMode && (
        <aside className="sidebar">
          <Link href="/dashboard" className="brand">
            <span className="brand-mark">
              <IconMedicalCross size={22} stroke={2.2} />
            </span>
            <span className="brand-name">Pharmalytics</span>
          </Link>

          {currentTenant && (
            <div style={{ padding: '0 16px 16px' }}>
              <Menu shadow="md" width={220} position="bottom-start">
                <Menu.Target>
                  <button
                    type="button"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 6,
                      border: '1px solid #233532',
                      background: '#13211f',
                      color: '#e2f0ec',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {currentTenant.name}
                    </span>
                    <IconChevronDown size={14} style={{ flexShrink: 0, marginLeft: 6, opacity: 0.7 }} />
                  </button>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Label>Switch Pharmacy Workspace</Menu.Label>
                  {tenants.map((t) => (
                    <Menu.Item
                      key={t.id}
                      onClick={() => switchTenant(t.id)}
                      style={{ fontWeight: t.id === tenantId ? 700 : 400 }}
                    >
                      {t.name}
                    </Menu.Item>
                  ))}
                </Menu.Dropdown>
              </Menu>
            </div>
          )}

          <div className="nav-section">Workspace Core</div>
          {filteredNavigation.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));
            return (
              <Link className={`nav-link${active ? ' active' : ''}`} href={href} key={href}>
                <Icon size={17} stroke={1.8} />
                {label}
              </Link>
            );
          })}

          <div className="sidebar-foot">
            {user && (
              <Group justify="space-between" wrap="nowrap" style={{ width: '100%' }}>
                <Group gap="sm" wrap="nowrap" style={{ overflow: 'hidden' }}>
                  <Avatar color="teal" radius="xl" size="sm">
                    {user.name.charAt(0).toUpperCase()}
                  </Avatar>
                  <div style={{ overflow: 'hidden' }}>
                    <Text size="xs" fw={700} truncate>
                      {user.name}
                    </Text>
                    <Text size="xs" c="dimmed" truncate>
                      {user.roles?.[0] ?? 'Staff'} &bull; {user.email}
                    </Text>
                  </div>
                </Group>
                <Tooltip label="Sign out" position="right">
                  <ActionIcon variant="subtle" color="red" size="sm" onClick={handleLogout}>
                    <IconLogout size={16} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            )}
          </div>
        </aside>
      )}

      {/* Main Workspace Area */}
      <section className="workspace">
        {/* Topbar: Dynamically adapts to Kiosk vs Standard mode */}
        <header
          className="topbar"
          style={{
            background: showKioskMode ? '#ffffff' : 'rgba(255,255,255,.9)',
            borderBottom: '1px solid #e2ece9',
            padding: showKioskMode ? '0 24px' : '0 34px',
            height: 64,
          }}
        >
          {showKioskMode ? (
            /* KIOSK / CASHIER FULL-SCREEN HEADER */
            <Group justify="space-between" align="center" style={{ width: '100%' }}>
              <Group gap="md">
                {/* Admin/Owner Exit Option */}
                {isOwnerOrAdmin && (
                  <Button
                    component={Link}
                    href="/dashboard"
                    variant="default"
                    size="xs"
                    leftSection={<IconArrowLeft size={16} />}
                    onClick={() => setIsKioskActive(false)}
                  >
                    Exit to Dashboard
                  </Button>
                )}

                <Group gap="xs">
                  <span className="brand-mark" style={{ width: 28, height: 28, borderRadius: 8 }}>
                    <IconMedicalCross size={16} stroke={2.5} />
                  </span>
                  <Text fw={800} size="sm" c="#0f172a">
                    {currentTenant?.name ?? 'Pharmalytics POS'}
                  </Text>
                  <Badge variant="filled" color="teal" size="sm">
                    OTC Counter Kiosk
                  </Badge>
                </Group>
              </Group>

              <Group gap="sm">
                <Badge variant="light" color="teal" size="md">
                  Operator: {user?.name} ({user?.roles?.[0] ?? 'Cashier'})
                </Badge>

                {/* Fullscreen Toggle */}
                <Tooltip label={isBrowserFullscreen ? 'Exit Native Fullscreen' : 'Enter Native Fullscreen'}>
                  <ActionIcon
                    variant="light"
                    color="teal"
                    size="md"
                    radius="md"
                    onClick={toggleBrowserFullscreen}
                  >
                    {isBrowserFullscreen ? <IconMinimize size={16} /> : <IconMaximize size={16} />}
                  </ActionIcon>
                </Tooltip>

                {/* If Admin, allow toggling off Kiosk sidebar collapse */}
                {isOwnerOrAdmin && (
                  <Button
                    variant="subtle"
                    size="xs"
                    color="gray"
                    onClick={() => setIsKioskActive(!isKioskActive)}
                  >
                    Show Sidebar
                  </Button>
                )}

                {/* Lock / Logout */}
                <Tooltip label="Lock Register / Logout">
                  <ActionIcon variant="light" color="red" size="md" radius="md" onClick={handleLogout}>
                    <IconLogout size={16} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Group>
          ) : (
            /* STANDARD DESKTOP TOPBAR */
            <Group justify="space-between" align="center" style={{ width: '100%' }}>
              <Group gap="xs">
                <Text size="sm" fw={500} c="dimmed">
                  Pharmacy Enterprise
                </Text>
                {currentTenant && (
                  <>
                    <Text size="sm" c="dimmed">&bull;</Text>
                    <Badge variant="dot" color="teal" size="sm">
                      {currentTenant.name} ({currentTenant.currency_code ?? 'PKR'})
                    </Badge>
                  </>
                )}
              </Group>

              <Group gap="sm">
                {/* On /sales, allow Admin to toggle Kiosk Full-Screen mode */}
                {isPosPage && (
                  <Button
                    size="xs"
                    color="teal"
                    variant="light"
                    leftSection={<IconMaximize size={14} />}
                    onClick={() => setIsKioskActive(true)}
                  >
                    Kiosk Fullscreen Mode
                  </Button>
                )}

                <Badge variant="light" color="teal" radius="sm">
                  Role: {user?.roles?.[0] ?? 'Owner'}
                </Badge>
                <Avatar color="teal" radius="xl" size="sm">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'P'}
                </Avatar>
              </Group>
            </Group>
          )}
        </header>

        {children}
      </section>
    </div>
  );
}
