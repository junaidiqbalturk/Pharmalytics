'use client';

import { useState } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Group,
  Modal,
  Stack,
  Switch,
  Text,
  TextInput,
  Textarea,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconEdit, IconPlus, IconSearch, IconTrash } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DataTable } from 'mantine-datatable';
import { AppShell } from '@/components/app-shell';
import {
  MedicineCategory,
  createCategory,
  deleteCategory,
  getMedicineCategories,
  updateCategory,
} from '@/features/catalog/api';
import { useAuthStore } from '@/stores/auth-store';

export default function CategoriesPage() {
  const token = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  // Modal states
  const [opened, { open, close }] = useDisclosure(false);
  const [editingCategory, setEditingCategory] = useState<MedicineCategory | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  const { data, isPending, error } = useQuery({
    queryKey: ['medicine-categories'],
    queryFn: getMedicineCategories,
    enabled: Boolean(token),
  });

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setName('');
    setSlug('');
    setDescription('');
    setIsActive(true);
    open();
  };

  const handleOpenEdit = (cat: MedicineCategory) => {
    setEditingCategory(cat);
    setName(cat.name);
    setSlug(cat.slug);
    setDescription(cat.description ?? '');
    setIsActive(cat.is_active);
    open();
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      if (editingCategory) {
        return updateCategory(editingCategory.id, {
          name,
          slug: slug.trim() || undefined,
          description: description.trim() || undefined,
          is_active: isActive,
        });
      }
      return createCategory({
        name,
        slug: slug.trim() || undefined,
        description: description.trim() || undefined,
        is_active: isActive,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicine-categories'] });
      notifications.show({
        title: editingCategory ? 'Category updated' : 'Category created',
        message: `Category "${name}" has been successfully saved.`,
        color: 'teal',
        icon: <IconCheck size={16} />,
      });
      close();
    },
    onError: (err: Error) => {
      notifications.show({
        title: 'Error saving category',
        message: err.message,
        color: 'red',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicine-categories'] });
      notifications.show({
        title: 'Category deactivated',
        message: 'The category status has been updated to inactive.',
        color: 'teal',
        icon: <IconCheck size={16} />,
      });
    },
    onError: (err: Error) => {
      notifications.show({
        title: 'Failed to deactivate category',
        message: err.message,
        color: 'red',
      });
    },
  });

  const filteredCategories = (data?.data ?? []).filter((cat) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return cat.name.toLowerCase().includes(term) || cat.slug.toLowerCase().includes(term);
  });

  return (
    <AppShell>
      <main className="content">
        <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
          <div>
            <div className="eyebrow">Foundation · Catalog</div>
            <h1 className="page-title">Medicine categories</h1>
            <p className="page-subtitle">Organize your medicine master with pharmacy-specific categories.</p>
          </div>
          <Button leftSection={<IconPlus size={16} />} onClick={handleOpenCreate}>
            Add category
          </Button>
        </Group>

        {!token && (
          <Alert color="orange" mt="xl" title="Sign in to view your categories">
            Category data is scoped to your pharmacy workspace.
          </Alert>
        )}
        {error && (
          <Alert color="red" mt="xl" title="Could not load categories">
            {error.message}
          </Alert>
        )}

        <section className="panel" style={{ marginTop: 24 }}>
          <Group justify="space-between" mb="md" wrap="wrap">
            <div>
              <Text fw={700} size="sm">Categories</Text>
              <Text c="dimmed" size="xs" mt={3}>{filteredCategories.length} categories</Text>
            </div>
            <TextInput
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              placeholder="Search category name or slug..."
              leftSection={<IconSearch size={16} />}
              w={260}
            />
          </Group>

          <DataTable
            withTableBorder
            borderRadius="md"
            minHeight={160}
            fetching={isPending && Boolean(token)}
            records={filteredCategories}
            columns={[
              {
                accessor: 'name',
                title: 'Name',
                render: ({ name, slug }) => (
                  <div>
                    <Text size="sm" fw={600}>{name}</Text>
                    <Text size="xs" c="dimmed">{slug}</Text>
                  </div>
                ),
              },
              {
                accessor: 'is_active',
                title: 'Status',
                render: ({ is_active }) => (
                  <Badge color={is_active ? 'teal' : 'gray'} variant="light">
                    {is_active ? 'Active' : 'Inactive'}
                  </Badge>
                ),
              },
              {
                accessor: 'actions',
                title: '',
                textAlign: 'right',
                render: (cat) => (
                  <Group gap="xs" justify="flex-end">
                    <Tooltip label="Edit category">
                      <ActionIcon variant="subtle" color="teal" size="sm" onClick={() => handleOpenEdit(cat)}>
                        <IconEdit size={16} />
                      </ActionIcon>
                    </Tooltip>
                    {cat.is_active && (
                      <Tooltip label="Deactivate category">
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          size="sm"
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to deactivate "${cat.name}"?`)) {
                              deleteMutation.mutate(cat.id);
                            }
                          }}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </Group>
                ),
              },
            ]}
            noRecordsText={token ? 'No categories match your search.' : 'Sign in to load categories.'}
          />
        </section>

        {/* Modal: Create / Edit Category */}
        <Modal
          opened={opened}
          onClose={close}
          title={<Text fw={700}>{editingCategory ? 'Edit category' : 'Add new category'}</Text>}
          centered
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate();
            }}
          >
            <Stack gap="md">
              <TextInput
                label="Category Name"
                placeholder="e.g. Antibiotics, Analgesics"
                required
                value={name}
                onChange={(e) => setName(e.currentTarget.value)}
              />
              <TextInput
                label="URL Slug (Optional)"
                placeholder="auto-generated if empty"
                value={slug}
                onChange={(e) => setSlug(e.currentTarget.value)}
              />
              <Textarea
                label="Description"
                placeholder="Brief description of products in this category"
                value={description}
                onChange={(e) => setDescription(e.currentTarget.value)}
                minRows={2}
              />
              <Switch
                label="Active Status"
                checked={isActive}
                onChange={(e) => setIsActive(e.currentTarget.checked)}
              />

              <Group justify="flex-end" mt="md">
                <Button variant="default" onClick={close}>Cancel</Button>
                <Button type="submit" loading={saveMutation.isPending} disabled={!name.trim()}>
                  {editingCategory ? 'Update' : 'Create'}
                </Button>
              </Group>
            </Stack>
          </form>
        </Modal>
      </main>
    </AppShell>
  );
}
