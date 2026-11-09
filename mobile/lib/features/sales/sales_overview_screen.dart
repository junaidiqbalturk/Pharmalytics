import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:intl/intl.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/status_badge.dart';
import '../../core/services/api_client.dart';
import 'invoices_list_screen.dart';

class SalesOverviewScreen extends StatefulWidget {
  final bool showBackButton;
  const SalesOverviewScreen({super.key, this.showBackButton = false});

  @override
  State<SalesOverviewScreen> createState() => _SalesOverviewScreenState();
}

class _SalesOverviewScreenState extends State<SalesOverviewScreen> {
  String _selectedFilter = '30D';
  late Future<Map<String, dynamic>> _salesFuture;

  @override
  void initState() {
    super.initState();
    _loadSales();
  }

  void _loadSales() {
    final periodParam = _selectedFilter == 'Today'
        ? 'today'
        : _selectedFilter == '7D'
            ? 'this_week'
            : _selectedFilter == '30D'
                ? 'this_month'
                : 'this_month';
    _salesFuture = ApiClient().fetchSalesSummary(period: periodParam);
  }

  @override
  Widget build(BuildContext context) {
    final currencyFormatter = NumberFormat('#,##0');

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: AppBar(
        leading: widget.showBackButton
            ? IconButton(
                icon: const Icon(LucideIcons.arrowLeft, size: 20),
                onPressed: () => Navigator.of(context).pop(),
              )
            : null,
        title: const Text('Sales'),
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.receipt, size: 20, color: AppColors.teal),
            tooltip: 'View Invoices',
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const InvoicesListScreen()),
              );
            },
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: FutureBuilder<Map<String, dynamic>>(
        future: _salesFuture,
        builder: (context, snapshot) {
          final data = snapshot.data;
          final summary = data?['summary'] as Map<String, dynamic>? ?? {};
          final totalRevenue = double.tryParse(summary['total_revenue']?.toString() ?? '0') ?? 0.0;
          final transactionsCount = int.tryParse(summary['transactions_count']?.toString() ?? '0') ?? 0;

          // Payment breakdown
          final paymentMap = data?['payment_breakdown'] as Map<String, dynamic>? ?? {};
          double cashPct = 0.0;
          double cardPct = 0.0;
          double creditPct = 0.0;

          paymentMap.forEach((key, val) {
            final k = key.toString().toLowerCase();
            final pct = double.tryParse(val?['percentage']?.toString() ?? '0') ?? 0.0;
            if (k.contains('cash')) cashPct = pct;
            if (k.contains('card') || k.contains('digital') || k.contains('bank')) cardPct = pct;
            if (k.contains('credit') || k.contains('split')) creditPct = pct;
          });

          if (cashPct == 0 && cardPct == 0 && creditPct == 0) {
            cashPct = 100.0;
          }

          // Top medicines
          final rawTop = data?['top_selling_medicines'] as List<dynamic>? ?? [];

          // Trend
          final rawTrend = data?['sales_trend'] as List<dynamic>? ?? [];
          final spots = <FlSpot>[];
          final trendLabels = <String>[];
          for (int i = 0; i < rawTrend.length; i++) {
            final t = rawTrend[i] as Map<String, dynamic>;
            final amt = double.tryParse(t['total']?.toString() ?? '0') ?? 0.0;
            spots.add(FlSpot(i.toDouble(), amt));
            final dateStr = t['date']?.toString() ?? '';
            final parts = dateStr.split('-');
            trendLabels.add(parts.length >= 3 ? '${parts[2]}/${parts[1]}' : dateStr);
          }

          return RefreshIndicator(
            onRefresh: () async {
              setState(() => _loadSales());
              await _salesFuture;
            },
            color: AppColors.teal,
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Period Filters
                  Container(
                    padding: const EdgeInsets.all(3),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEAEEF4),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: ['Today', '7D', '30D', 'Custom'].map((filter) {
                        final isSelected = _selectedFilter == filter;
                        return Expanded(
                          child: GestureDetector(
                            onTap: () {
                              setState(() {
                                _selectedFilter = filter;
                                _loadSales();
                              });
                            },
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 8),
                              decoration: BoxDecoration(
                                color: isSelected ? AppColors.white : Colors.transparent,
                                borderRadius: BorderRadius.circular(6),
                                boxShadow: isSelected
                                    ? [
                                        BoxShadow(
                                          color: Colors.black.withValues(alpha: 0.04),
                                          blurRadius: 2,
                                          offset: const Offset(0, 1),
                                        ),
                                      ]
                                    : null,
                              ),
                              child: Text(
                                filter,
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                                  color: isSelected ? AppColors.navy : AppColors.textSecondary,
                                ),
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Total Sales Card with Trend
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
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Total Sales',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: AppColors.textSecondary,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'Rs. ${currencyFormatter.format(totalRevenue)}',
                                  style: const TextStyle(
                                    fontSize: 24,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.navy,
                                  ),
                                ),
                              ],
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: AppColors.tealSoft,
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                '$transactionsCount orders',
                                style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.teal,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Period: $_selectedFilter',
                          style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                        ),
                        const SizedBox(height: 20),

                        // Area / Line Chart
                        if (spots.isEmpty)
                          Container(
                            height: 120,
                            alignment: Alignment.center,
                            child: const Text(
                              'No transactions recorded for this period yet',
                              style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                            ),
                          )
                        else
                          SizedBox(
                            height: 150,
                            child: LineChart(
                              LineChartData(
                                gridData: const FlGridData(show: false),
                                titlesData: FlTitlesData(
                                  leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                                  rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                                  topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                                  bottomTitles: AxisTitles(
                                    sideTitles: SideTitles(
                                      showTitles: true,
                                      getTitlesWidget: (value, meta) {
                                        final idx = value.toInt();
                                        if (idx >= 0 && idx < trendLabels.length) {
                                          return Padding(
                                            padding: const EdgeInsets.only(top: 8.0),
                                            child: Text(
                                              trendLabels[idx],
                                              style: const TextStyle(
                                                fontSize: 10,
                                                color: AppColors.textMuted,
                                              ),
                                            ),
                                          );
                                        }
                                        return const SizedBox.shrink();
                                      },
                                      interval: 1,
                                    ),
                                  ),
                                ),
                                borderData: FlBorderData(show: false),
                                lineBarsData: [
                                  LineChartBarData(
                                    spots: spots,
                                    isCurved: true,
                                    curveSmoothness: 0.35,
                                    color: AppColors.teal,
                                    barWidth: 2.5,
                                    isStrokeCapRound: true,
                                    dotData: const FlDotData(show: true),
                                    belowBarData: BarAreaData(
                                      show: true,
                                      color: AppColors.teal.withValues(alpha: 0.08),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Payment Method Breakdown
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
                          'Payment Method Breakdown',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: AppColors.navy,
                          ),
                        ),
                        const SizedBox(height: 16),
                        Row(
                          children: [
                            // Donut chart
                            SizedBox(
                              width: 110,
                              height: 110,
                              child: Stack(
                                alignment: Alignment.center,
                                children: [
                                  PieChart(
                                    PieChartData(
                                      sectionsSpace: 2,
                                      centerSpaceRadius: 36,
                                      sections: [
                                        if (cashPct > 0)
                                          PieChartSectionData(
                                            color: AppColors.teal,
                                            value: cashPct,
                                            showTitle: false,
                                            radius: 16,
                                          ),
                                        if (cardPct > 0)
                                          PieChartSectionData(
                                            color: const Color(0xFF38B2AC),
                                            value: cardPct,
                                            showTitle: false,
                                            radius: 16,
                                          ),
                                        if (creditPct > 0)
                                          PieChartSectionData(
                                            color: AppColors.warning,
                                            value: creditPct,
                                            showTitle: false,
                                            radius: 16,
                                          ),
                                      ],
                                    ),
                                  ),
                                  Column(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Text(
                                        'Rs. ${currencyFormatter.format(totalRevenue)}',
                                        style: const TextStyle(
                                          fontSize: 9,
                                          fontWeight: FontWeight.w700,
                                          color: AppColors.navy,
                                        ),
                                      ),
                                      const Text(
                                        'Total',
                                        style: TextStyle(
                                          fontSize: 9,
                                          color: AppColors.textMuted,
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 24),
                            // Legend
                            Expanded(
                              child: Column(
                                children: [
                                  _buildLegendItem('Cash', '${cashPct.toStringAsFixed(0)}%', AppColors.teal),
                                  const SizedBox(height: 8),
                                  _buildLegendItem('Card', '${cardPct.toStringAsFixed(0)}%', const Color(0xFF38B2AC)),
                                  const SizedBox(height: 8),
                                  _buildLegendItem('Credit', '${creditPct.toStringAsFixed(0)}%', AppColors.warning),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Top-Selling Medicines
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
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              'Top-Selling Medicines',
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w600,
                                color: AppColors.navy,
                              ),
                            ),
                            TextButton(
                              onPressed: () {
                                Navigator.of(context).push(
                                  MaterialPageRoute(builder: (_) => const InvoicesListScreen()),
                                );
                              },
                              style: TextButton.styleFrom(
                                padding: EdgeInsets.zero,
                                minimumSize: Size.zero,
                                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              ),
                              child: const Text(
                                'View sales',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.teal,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        if (rawTop.isEmpty)
                          const Padding(
                            padding: EdgeInsets.symmetric(vertical: 12),
                            child: Text(
                              'No sales data recorded yet for this period.',
                              style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                            ),
                          )
                        else
                          ...rawTop.map((m) {
                            final map = m as Map<String, dynamic>;
                            final name = map['name']?.toString() ?? 'Medicine';
                            final qty = map['quantity_sold']?.toString() ?? '0';
                            final rev = map['total_revenue']?.toString() ?? '0';
                            return Column(
                              children: [
                                _buildTopMedicineRow(name, '$qty units sold', 'Rs. $rev'),
                                const Divider(height: 18, color: AppColors.borderLight),
                              ],
                            );
                          }),
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

  Widget _buildLegendItem(String label, String percent, Color color) {
    return Row(
      children: [
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(3),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            label,
            style: const TextStyle(
              fontSize: 13,
              color: AppColors.textPrimary,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
        Text(
          percent,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: AppColors.navy,
          ),
        ),
      ],
    );
  }

  Widget _buildTopMedicineRow(String name, String qty, String revenue) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              name,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.navy,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              qty,
              style: const TextStyle(
                fontSize: 11,
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ),
        Text(
          revenue,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: AppColors.navy,
          ),
        ),
      ],
    );
  }
}
