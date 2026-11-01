'use client';

import { useState } from 'react';
import {
  ActionIcon,
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Grid,
  Group,
  Modal,
  Paper,
  PasswordInput,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconCheck,
  IconLock,
  IconPlus,
  IconShieldCheck,
  IconTrash,
  IconUserCheck,
  IconUsers,
} from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppShell } from '@/components/app-shell';
import { StaffMember, createStaff, deleteStaff, getStaff } from '@/features/staff/api';
import { useAuthStore } from '@/stores/auth-store';

export default function StaffManagementPage() {
  const token = useAuthStore((state) => state.accessToken);
  const currentTenantId = useAuthStore((state) => state.tenantId);
  const tenants = useAuthStore((state) => state.tenants);
  const currentTenant = tenants.find((t) => t.id === currentTenantId);

  const queryClient = useQueryClient();
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'pharmacist' | 'cashier'>('cashier');

  // Query staff members
  const { data: staffData, isPending, error } = useQuery({
    queryKey: ['staff-members', currentTenantId],
    queryFn: getStaff,
    enabled: Boolean(token),
  });

  const staffList = staffData?.data ?? [];

  // Create staff mutation
  const createMutation = useMutation({
    mutationFn: () =>
      createStaff({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
      }),
    onSuccess: ({ data }) => {
      queryClient.invalidateQueries({ queryKey: ['staff-members'] });
      notifications.show({
        title: 'Staff Member Added',
        message: `${data.name} has been added as a ${role} to ${currentTenant?.name}.`,
        color: 'teal',
        icon: <IconCheck size={16} />,
      });
      setName('');
      setEmail('');
      setPassword('');
      setRole('cashier');
      closeModal();
    },
    onError: (err: Error) => {
      notifications.show({
        title: 'Failed to add staff',
        message: err.message,
        color: 'red',
      });
    },
  });

  // Delete staff mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteStaff(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-members'] });
      notifications.show({
        title: 'Staff Member Removed',
        message: 'Account access has been detached from this pharmacy workspace.',
        color: 'teal',
      });
    },
    onError: (err: Error) => {
      notifications.show({
        title: 'Failed to remove staff',
        message: err.message,
        color: 'red',
      });
    },
  });

  const getRoleBadge = (roles: string[]) => {
    if (roles.includes('owner')) {
      return <Badge color="yellow" variant="filled">Owner</Badge>;
    }
    if (roles.includes('admin')) {
      return <Badge color="grape" variant="filled">Admin</Badge>;
    }
    if (roles.includes('pharmacist')) {
      return <Badge color="blue" variant="filled">Pharmacist</Badge>;
    }
    if (roles.includes('cashier')) {
      return <Badge color="teal" variant="filled">Cashier (POS)</Badge>;
    }
    return <Badge color="gray" variant="light">Staff</Badge>;
  };

  const getRoleDescription = (roles: string[]) => {
    if (roles.includes('owner') || roles.includes('admin')) {
      return 'Full access to all pharmacy modules, settings & accounting';
    }
    if (roles.includes('pharmacist')) {
      return 'Manages medicines, inventory batches, purchase receiving & POS';
    }
    if (roles.includes('cashier')) {
      return 'Locked strictly to POS Counter Kiosk dispensing only';
    }
    return 'Standard view access';
  };

  return (
    <AppShell>
      <main className="content" style={{ maxWidth: 1200, padding: '24px 32px' }}>
        {/* Header */}
        <Group justify="space-between" align="flex-start" mb="xl">
          <div>
            <div className="eyebrow">WORKSPACE ADMINISTRATION & RBAC</div>
            <h1 className="page-title" style={{ margin: '4px 0' }}>
              Staff & Access Control
            </h1>
            <Text size="sm" c="dimmed">
              Manage cashiers, pharmacists, and administrative roles for <b>{currentTenant?.name}</b>.
            </Text>
          </div>

          <Button
            leftSection={<IconPlus size={16} />}
            color="teal"
            onClick={openModal}
            style={{ fontWeight: 700 }}
          >
            Add Staff / Cashier
          </Button>
        </Group>

        {error && (
          <Alert color="red" mb="md" title="Could not load staff members">
            {error.message}
          </Alert>
        )}

        <Grid gutter="lg">
          {/* Left Column: Staff Table */}
          <Grid.Col span={{ base: 12, md: 8 }}>
            <Paper p="md" radius="md" withBorder style={{ background: '#ffffff', borderColor: '#e2ece9' }}>
              <Group justify="space-between" mb="md">
                <Text fw={750} size="md" c="#0f172a">
                  Active Team Members ({staffList.length})
                </Text>
                <Badge variant="dot" color="teal">
                  Tenant: {currentTenant?.name}
                </Badge>
              </Group>

              <Table striped highlightOnHover withTableBorder>
                <Table.Thead style={{ background: '#f8fafc' }}>
                  <Table.Tr>
                    <Table.Th>Staff Member</Table.Th>
                    <Table.Th>Tenant Role</Table.Th>
                    <Table.Th>Access Boundary</Table.Th>
                    <Table.Th ta="right">Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {isPending ? (
                    <Table.Tr>
                      <Table.Td colSpan={4} ta="center" py="xl" c="dimmed">
                        Loading team accounts...
                      </Table.Td>
                    </Table.Tr>
                  ) : staffList.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={4} ta="center" py="xl" c="dimmed">
                        No additional staff members registered yet.
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    staffList.map((member) => {
                      const isOwner = member.roles.includes('owner');
                      return (
                        <Table.Tr key={member.id}>
                          <Table.Td>
                            <Group gap="sm" wrap="nowrap">
                              <Avatar color="teal" radius="xl" size="sm">
                                {member.name.charAt(0).toUpperCase()}
                              </Avatar>
                              <div>
                                <Text size="sm" fw={700} c="#0f172a">
                                  {member.name}
                                </Text>
                                <Text size="xs" c="dimmed">
                                  {member.email}
                                </Text>
                              </div>
                            </Group>
                          </Table.Td>
                          <Table.Td>{getRoleBadge(member.roles)}</Table.Td>
                          <Table.Td>
                            <Text size="xs" c="#475569">
                              {getRoleDescription(member.roles)}
                            </Text>
                          </Table.Td>
                          <Table.Td ta="right">
                            {!isOwner && (
                              <Tooltip label="Remove staff member">
                                <ActionIcon
                                  color="red"
                                  variant="subtle"
                                  onClick={() => {
                                    if (confirm(`Revoke access for ${member.name} from this pharmacy?`)) {
                                      deleteMutation.mutate(member.id);
                                    }
                                  }}
                                  loading={deleteMutation.isPending}
                                >
                                  <IconTrash size={16} />
                                </ActionIcon>
                              </Tooltip>
                            )}
                          </Table.Td>
                        </Table.Tr>
                      );
                    })
                  )}
                </Table.Tbody>
              </Table>
            </Paper>
          </Grid.Col>

          {/* Right Column: Role Permissions Matrix Guide */}
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Paper p="md" radius="md" withBorder style={{ background: '#ffffff', borderColor: '#e2ece9' }}>
              <Group gap="xs" mb="sm">
                <ThemeIcon color="teal" variant="light" size="md">
                  <IconShieldCheck size={18} />
                </ThemeIcon>
                <Text fw={750} size="sm" c="#0f172a">
                  Permission Matrix Guide
                </Text>
              </Group>
              <Text size="xs" c="dimmed" mb="md">
                Roles are strictly enforced by the backend on every API request.
              </Text>

              <Stack gap="xs">
                {/* Cashier card */}
                <Card padding="xs" radius="sm" withBorder style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
                  <Group justify="space-between">
                    <Text size="xs" fw={750} c="#15803d">
                      Cashier Role
                    </Text>
                    <Badge size="xs" color="teal">POS Only</Badge>
                  </Group>
                  <Text size="11px" c="#166534" mt={4}>
                    &bull; Opens directly into locked Fullscreen Kiosk Mode.<br />
                    &bull; Zero access to accounting, reports, or supplier costs.<br />
                    &bull; Dispenses Patta, Cut Goli, and Boxes.
                  </Text>
                </Card>

                {/* Pharmacist card */}
                <Card padding="xs" radius="sm" withBorder style={{ background: '#eff6ff', borderColor: '#bfdbfe' }}>
                  <Group justify="space-between">
                    <Text size="xs" fw={750} c="#1e40af">
                      Pharmacist Role
                    </Text>
                    <Badge size="xs" color="blue">Operations</Badge>
                  </Group>
                  <Text size="11px" c="#1e3a8a" mt={4}>
                    &bull; Manages catalog, batches, and reorder levels.<br />
                    &bull; Performs inventory receipts and POS dispensing.<br />
                    &bull; Blocked from double-entry general ledger.
                  </Text>
                </Card>

                {/* Admin/Owner card */}
                <Card padding="xs" radius="sm" withBorder style={{ background: '#fefce8', borderColor: '#fef08a' }}>
                  <Group justify="space-between">
                    <Text size="xs" fw={750} c="#854d0e">
                      Admin / Owner Role
                    </Text>
                    <Badge size="xs" color="yellow">Unrestricted</Badge>
                  </Group>
                  <Text size="11px" c="#713f12" mt={4}>
                    &bull; Full control over financial accounting & journal.<br />
                    &bull; Can switch between Fullscreen POS & Backoffice.<br />
                    &bull; Manages pharmacy staff and invites team members.
                  </Text>
                </Card>
              </Stack>
            </Paper>
          </Grid.Col>
        </Grid>

        {/* Modal: Add Staff Member */}
        <Modal
          opened={modalOpened}
          onClose={closeModal}
          title={<Text fw={750} size="md">Add Pharmacy Staff Member</Text>}
          centered
          size="md"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate();
            }}
          >
            <Stack gap="sm">
              <TextInput
                label="Full Name"
                placeholder="e.g. Tariq Mehmood"
                required
                value={name}
                onChange={(e) => setName(e.currentTarget.value)}
              />

              <TextInput
                label="Email Address"
                placeholder="e.g. tariq.pos@pharmacy.com"
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
              />

              <PasswordInput
                label="Initial Password"
                placeholder="Minimum 8 characters"
                required
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
              />

              <Select
                label="Assign Role in this Pharmacy"
                description="Controls screen access and permission boundaries."
                value={role}
                onChange={(val) => setRole((val as any) || 'cashier')}
                data={[
                  { label: 'Cashier (Locked to POS Counter terminal only)', value: 'cashier' },
                  { label: 'Pharmacist (Catalog, Batches, Inventory & POS)', value: 'pharmacist' },
                  { label: 'Admin (Full Management & Accounting access)', value: 'admin' },
                ]}
                required
              />

              <Alert color="teal" mt="xs" title="Role Access Notice">
                {role === 'cashier' && (
                  <Text size="xs">
                    This user will immediately be routed to the <b>POS Counter Terminal</b> in full-screen mode upon login, with all financial and procurement data hidden.
                  </Text>
                )}
                {role === 'pharmacist' && (
                  <Text size="xs">
                    This user will manage medicines, expiry dates, batch stock movements, and counter dispensing.
                  </Text>
                )}
                {role === 'admin' && (
                  <Text size="xs">
                    This user will have full administrative rights across this pharmacy branch.
                  </Text>
                )}
              </Alert>

              <Group justify="flex-end" mt="md">
                <Button variant="default" onClick={closeModal}>
                  Cancel
                </Button>
                <Button
                  color="teal"
                  type="submit"
                  loading={createMutation.isPending}
                  disabled={!name.trim() || !email.trim() || password.length < 8}
                >
                  Create & Grant Access
                </Button>
              </Group>
            </Stack>
          </form>
        </Modal>
      </main>
    </AppShell>
  );
}
