import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/status_badge.dart';
import '../../core/models/pharmalytics_models.dart';
import '../../core/services/api_client.dart';

class FinanceScreen extends StatefulWidget {
  final bool showBackButton;
  const FinanceScreen({super.key, this.showBackButton = false});

  @override
  State<FinanceScreen> createState() => _FinanceScreenState();
}

class _FinanceScreenState extends State<FinanceScreen> {
  String _selectedPeriod = 'This Month';
  late Future<FinancialOverviewData> _financeFuture;

  @override
  void initState() {
    super.initState();
    _loadFinance();
  }

  void _loadFinance() {
    final periodParam = _selectedPeriod == 'Last Month'
        ? 'last_month'
        : _selectedPeriod == 'This Quarter'
            ? 'this_quarter'
            : _selectedPeriod == 'This Year'
                ? 'this_year'
                : 'this_month';
    _financeFuture = ApiClient().fetchFinancialSummary(period: periodParam);
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
        title: const Text('Finance'),
      ),
      body: FutureBuilder<FinancialOverviewData>(
        future: _financeFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator(color: AppColors.teal));
          }

          final fin = snapshot.data;
          if (fin == null) {
            return const Center(child: Text('No financial data available'));
          }

          return RefreshIndicator(
            onRefresh: () async {
              setState(() => _loadFinance());
              await _financeFuture;
            },
            color: AppColors.teal,
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Period Selector
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.white,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: _selectedPeriod,
                        icon: const Icon(LucideIcons.chevronDown, size: 16, color: AppColors.navy),
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: AppColors.navy,
                        ),
                        items: ['This Month', 'Last Month', 'This Quarter', 'This Year']
                            .map((p) => DropdownMenuItem(value: p, child: Text(p)))
                            .toList(),
                        onChanged: (val) {
                          if (val != null) {
                            setState(() {
                              _selectedPeriod = val;
                              _loadFinance();
                            });
                          }
                        },
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // 2x2 Metric Grid
                  Row(
                    children: [
                      Expanded(
                        child: _buildFinanceCard(
                          icon: LucideIcons.trendingUp,
                          label: 'Revenue',
                          value: 'Rs. ${(fin.revenue / 1000000).toStringAsFixed(2)}M',
                          iconColor: AppColors.teal,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _buildFinanceCard(
                          icon: LucideIcons.boxes,
                          label: 'COGS',
                          value: 'Rs. ${(fin.cogs / 1000000).toStringAsFixed(2)}M',
                          iconColor: const Color(0xFF38B2AC),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: _buildFinanceCard(
                          icon: LucideIcons.coins,
                          label: 'Gross Profit',
                          value: 'Rs. ${(fin.grossProfit / 1000).toStringAsFixed(0)}K',
                          iconColor: AppColors.teal,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _buildFinanceCard(
                          icon: LucideIcons.receipt,
                          label: 'Expenses',
                          value: 'Rs. ${(fin.expenses / 1000).toStringAsFixed(0)}K',
                          iconColor: AppColors.critical,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Net Profit Card
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Net Profit',
                          style: TextStyle(
                            fontSize: 12,
                            color: AppColors.textSecondary,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Rs. ${(fin.netProfit / 1000).toStringAsFixed(0)}K',
                              style: const TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.w700,
                                color: AppColors.navy,
                              ),
                            ),
                            PercentageBadge(percentage: fin.netProfitGrowth, isPositive: fin.netProfitGrowth >= 0),
                          ],
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'vs. previous period',
                          style: TextStyle(
                            fontSize: 11,
                            color: AppColors.textMuted,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Balances & Working Capital
                  Container(
                    decoration: BoxDecoration(
                      color: AppColors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Column(
                      children: [
                        _buildBalanceRow(
                          icon: LucideIcons.wallet,
                          label: 'Cash Balance',
                          value: 'Rs. ${fin.cashBalance.toStringAsFixed(0)}',
                        ),
                        const Divider(height: 1, color: AppColors.borderLight),
                        _buildBalanceRow(
                          icon: LucideIcons.landmark,
                          label: 'Bank Balance',
                          value: 'Rs. ${(fin.bankBalance / 1000000).toStringAsFixed(2)}M',
                        ),
                        const Divider(height: 1, color: AppColors.borderLight),
                        _buildBalanceRow(
                          icon: LucideIcons.arrowDownLeft,
                          label: 'Receivables',
                          value: 'Rs. ${fin.receivables.toStringAsFixed(0)}',
                        ),
                        const Divider(height: 1, color: AppColors.borderLight),
                        _buildBalanceRow(
                          icon: LucideIcons.arrowUpRight,
                          label: 'Payables',
                          value: 'Rs. ${fin.payables.toStringAsFixed(0)}',
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

  Widget _buildFinanceCard({
    required IconData icon,
    required String label,
    required String value,
    required Color iconColor,
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
          Icon(icon, size: 20, color: iconColor),
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
              fontSize: 17,
              fontWeight: FontWeight.w700,
              color: AppColors.navy,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBalanceRow({
    required IconData icon,
    required String label,
    required String value,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        children: [
          Icon(icon, size: 18, color: AppColors.teal),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              label,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: AppColors.navy,
              ),
            ),
          ),
          Text(
            value,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: AppColors.navy,
            ),
          ),
        ],
      ),
    );
  }
}
