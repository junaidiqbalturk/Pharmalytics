import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/theme/app_theme.dart';
import '../../core/services/api_client.dart';
import 'medicines_list_screen.dart';

class InventoryOverviewScreen extends StatefulWidget {
  final bool showBackButton;
  const InventoryOverviewScreen({super.key, this.showBackButton = false});

  @override
  State<InventoryOverviewScreen> createState() => _InventoryOverviewScreenState();
}

class _InventoryOverviewScreenState extends State<InventoryOverviewScreen> {
  late Future<Map<String, dynamic>> _inventoryFuture;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  void _loadData() {
    _inventoryFuture = ApiClient().fetchInventorySummary();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: AppBar(
        leading: widget.showBackButton
            ? IconButton(
                icon: const Icon(LucideIcons.arrowLeft, size: 20),
                onPressed: () => Navigator.of(context).pop(),
              )
            : null,
        title: const Text('Inventory'),
      ),
      body: FutureBuilder<Map<String, dynamic>>(
        future: _inventoryFuture,
        builder: (context, snapshot) {
          final data = snapshot.data;
          final metrics = data?['metrics'] as Map<String, dynamic>? ?? {};

          final totalMedicines = metrics['total_catalog_medicines']?.toString() ?? '...';
          final inStockCount = metrics['in_stock_count']?.toString() ?? '...';
          final lowStockCount = metrics['low_stock_count']?.toString() ?? '...';
          final outOfStockCount = metrics['out_of_stock_count']?.toString() ?? '...';
          final nearExpiryCount = metrics['near_expiry_count']?.toString() ?? '...';
          final expiredCount = metrics['expired_count']?.toString() ?? '...';

          return RefreshIndicator(
            onRefresh: () async {
              setState(() => _loadData());
              await _inventoryFuture;
            },
            color: AppColors.teal,
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  // Search Bar
                  SizedBox(
                    height: 44,
                    child: TextField(
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => const MedicinesListScreen()),
                        );
                      },
                      readOnly: true,
                      decoration: InputDecoration(
                        hintText: 'Search medicine, batch or SKU',
                        hintStyle: const TextStyle(fontSize: 13, color: AppColors.textMuted),
                        prefixIcon: const Icon(LucideIcons.search, size: 18, color: AppColors.textMuted),
                        contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 12),
                        filled: true,
                        fillColor: AppColors.white,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: const BorderSide(color: AppColors.border),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: const BorderSide(color: AppColors.border),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // 6 Inventory Metric Cards
                  Row(
                    children: [
                      Expanded(
                        child: _buildInventoryMetricCard(
                          icon: LucideIcons.layers,
                          label: 'Total Medicines',
                          value: totalMedicines,
                          color: AppColors.teal,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _buildInventoryMetricCard(
                          icon: LucideIcons.packageCheck,
                          label: 'Available Stock',
                          value: inStockCount,
                          color: const Color(0xFF38B2AC),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: _buildInventoryMetricCard(
                          icon: LucideIcons.alertTriangle,
                          label: 'Low Stock',
                          value: lowStockCount,
                          color: AppColors.warning,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _buildInventoryMetricCard(
                          icon: LucideIcons.ban,
                          label: 'Out of Stock',
                          value: outOfStockCount,
                          color: AppColors.critical,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: _buildInventoryMetricCard(
                          icon: LucideIcons.hourglass,
                          label: 'Expiring Soon',
                          value: nearExpiryCount,
                          color: AppColors.warning,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _buildInventoryMetricCard(
                          icon: LucideIcons.calendarX,
                          label: 'Expired',
                          value: expiredCount,
                          color: AppColors.critical,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Navigation Sections
                  Container(
                    decoration: BoxDecoration(
                      color: AppColors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Column(
                      children: [
                        _buildNavTile(
                          context,
                          icon: LucideIcons.listFilter,
                          title: 'All Medicines',
                          subtitle: '$totalMedicines items in catalog',
                          onTap: () {
                            Navigator.of(context).push(
                              MaterialPageRoute(builder: (_) => const MedicinesListScreen()),
                            );
                          },
                        ),
                        const Divider(height: 1, color: AppColors.borderLight),
                        _buildNavTile(
                          context,
                          icon: LucideIcons.layers,
                          title: 'Batches & Expiry',
                          subtitle: 'Manage batch-wise stock',
                          onTap: () {
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) => const MedicinesListScreen(initialFilter: 'Expiring'),
                              ),
                            );
                          },
                        ),
                        const Divider(height: 1, color: AppColors.borderLight),
                        _buildNavTile(
                          context,
                          icon: LucideIcons.arrowLeftRight,
                          title: 'Stock Movements',
                          subtitle: 'Inward, outward and adjustments',
                          onTap: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Stock movements log view')),
                            );
                          },
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildInventoryMetricCard({
    required IconData icon,
    required String label,
    required String value,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: color),
          const SizedBox(height: 8),
          Text(
            label,
            style: const TextStyle(
              fontSize: 11,
              color: AppColors.textSecondary,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: AppColors.navy,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNavTile(
    BuildContext context, {
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return ListTile(
      onTap: onTap,
      leading: Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          color: AppColors.tealSoft,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(icon, size: 18, color: AppColors.teal),
      ),
      title: Text(
        title,
        style: const TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: AppColors.navy,
        ),
      ),
      subtitle: Text(
        subtitle,
        style: const TextStyle(
          fontSize: 11,
          color: AppColors.textSecondary,
        ),
      ),
      trailing: const Icon(LucideIcons.chevronRight, size: 18, color: AppColors.textMuted),
    );
  }
}
