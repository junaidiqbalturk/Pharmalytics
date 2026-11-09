import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/status_badge.dart';
import '../../core/models/pharmalytics_models.dart';
import '../../core/services/api_client.dart';
import 'purchase_order_details_screen.dart';

class PurchasesOverviewScreen extends StatefulWidget {
  final bool showBackButton;
  const PurchasesOverviewScreen({super.key, this.showBackButton = false});

  @override
  State<PurchasesOverviewScreen> createState() => _PurchasesOverviewScreenState();
}

class _PurchasesOverviewScreenState extends State<PurchasesOverviewScreen> {
  late Future<List<PurchaseOrder>> _purchasesFuture;

  @override
  void initState() {
    super.initState();
    _loadPurchases();
  }

  void _loadPurchases() {
    _purchasesFuture = ApiClient().fetchPurchaseOrders();
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
        title: const Text('Purchases'),
      ),
      body: FutureBuilder<List<PurchaseOrder>>(
        future: _purchasesFuture,
        builder: (context, snapshot) {
          final purchaseOrders = snapshot.data ?? [];
          final isLoading = snapshot.connectionState == ConnectionState.waiting && purchaseOrders.isEmpty;

          if (isLoading) {
            return const Center(child: CircularProgressIndicator(color: AppColors.teal));
          }

          return RefreshIndicator(
            onRefresh: () async {
              setState(() => _loadPurchases());
              await _purchasesFuture;
            },
            color: AppColors.teal,
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Top Summary Cards
                  Row(
                    children: [
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: AppColors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AppColors.border),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  const Icon(LucideIcons.shoppingBag, size: 18, color: AppColors.teal),
                                  const Spacer(),
                                ],
                              ),
                              const SizedBox(height: 8),
                              const Text(
                                'Purchase Orders',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: AppColors.textSecondary,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '${purchaseOrders.length}',
                                style: const TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.navy,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: AppColors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AppColors.border),
                          ),
                          child: const Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Icon(LucideIcons.packagePlus, size: 18, color: Color(0xFF38B2AC)),
                                  Spacer(),
                                ],
                              ),
                              SizedBox(height: 8),
                              Text(
                                'Goods Receipts',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: AppColors.textSecondary,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              SizedBox(height: 4),
                              Text(
                                '3',
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.navy,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // Action Tiles
                  Container(
                    decoration: BoxDecoration(
                      color: AppColors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Column(
                      children: [
                        _buildActionTile(
                          icon: LucideIcons.shoppingCart,
                          title: 'Purchase Orders',
                          subtitle: 'View and track all purchase orders',
                          onTap: () {},
                        ),
                        const Divider(height: 1, color: AppColors.borderLight),
                        _buildActionTile(
                          icon: LucideIcons.receipt,
                          title: 'Goods Receipts',
                          subtitle: 'View received stock (GRN)',
                          onTap: () {},
                        ),
                        const Divider(height: 1, color: AppColors.borderLight),
                        _buildActionTile(
                          icon: LucideIcons.users,
                          title: 'Suppliers',
                          subtitle: 'Manage supplier information',
                          onTap: () {},
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Recent Purchase Activity
                  const Text(
                    'Recent Purchase Activity',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: AppColors.navy,
                    ),
                  ),
                  const SizedBox(height: 12),

                  if (purchaseOrders.isEmpty)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 20),
                      child: Center(
                        child: Text(
                          'No recent purchase orders',
                          style: TextStyle(color: AppColors.textSecondary),
                        ),
                      ),
                    )
                  else
                    ...purchaseOrders.map((po) => Padding(
                          padding: const EdgeInsets.only(bottom: 10.0),
                          child: InkWell(
                            onTap: () {
                              Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (_) => PurchaseOrderDetailsScreen(order: po),
                                ),
                              );
                            },
                            borderRadius: BorderRadius.circular(12),
                            child: Container(
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                color: AppColors.white,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: AppColors.border),
                              ),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          po.poNumber,
                                          style: const TextStyle(
                                            fontSize: 13,
                                            fontWeight: FontWeight.w600,
                                            color: AppColors.navy,
                                          ),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          po.supplierName,
                                          style: const TextStyle(
                                            fontSize: 11,
                                            color: AppColors.textSecondary,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.end,
                                    children: [
                                      Text(
                                        'Rs. ${po.total.toStringAsFixed(0)}',
                                        style: const TextStyle(
                                          fontSize: 13,
                                          fontWeight: FontWeight.w700,
                                          color: AppColors.navy,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      StatusBadge.fromStatus(po.status),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ),
                        )),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildActionTile({
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
