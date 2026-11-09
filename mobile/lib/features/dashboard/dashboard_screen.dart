import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:intl/intl.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/status_badge.dart';
import '../../core/models/pharmalytics_models.dart';
import '../../core/services/api_client.dart';
import '../../core/services/supabase_realtime_service.dart';
import '../alerts/alerts_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  late Future<DashboardSummary> _summaryFuture;

  @override
  void initState() {
    super.initState();
    _summaryFuture = ApiClient().fetchDashboardSummary();
    SupabaseRealtimeService().addNewSaleListener(_onRealtimeSale);
  }

  @override
  void dispose() {
    SupabaseRealtimeService().removeNewSaleListener(_onRealtimeSale);
    super.dispose();
  }

  void _onRealtimeSale(Map<String, dynamic> payload) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('New counter sale recorded: Rs. ${payload['total_amount'] ?? ''}'),
          backgroundColor: AppColors.teal,
          duration: const Duration(seconds: 3),
        ),
      );
      _refresh();
    }
  }

  Future<void> _refresh() async {
    setState(() {
      _summaryFuture = ApiClient().fetchDashboardSummary();
    });
    await _summaryFuture;
  }

  @override
  Widget build(BuildContext context) {
    final currencyFormatter = NumberFormat('#,##0');
    final ownerName = ApiClient().currentUserName;

    return Scaffold(
      backgroundColor: AppColors.canvas,
      body: FutureBuilder<DashboardSummary>(
        future: _summaryFuture,
        builder: (context, snapshot) {
          final summary = snapshot.data;
          final isLoading = snapshot.connectionState == ConnectionState.waiting && summary == null;

          return RefreshIndicator(
            onRefresh: _refresh,
            color: AppColors.teal,
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Top Curved Navy Header with Today's Sales Card
                  Stack(
                    clipBehavior: Clip.none,
                    children: [
                      // Dark Navy Header Container
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.only(left: 20, right: 20, top: 56, bottom: 50),
                        decoration: const BoxDecoration(
                          color: AppColors.navy,
                          borderRadius: BorderRadius.only(
                            bottomLeft: Radius.circular(24),
                            bottomRight: Radius.circular(24),
                          ),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Good Morning,',
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: Color(0xFF9FB3C8),
                                    fontWeight: FontWeight.w400,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  ownerName,
                                  style: const TextStyle(
                                    fontSize: 20,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.textWhite,
                                  ),
                                ),
                              ],
                            ),
                            Stack(
                              children: [
                                Container(
                                  decoration: BoxDecoration(
                                    color: Colors.white.withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: IconButton(
                                    icon: const Icon(LucideIcons.bell, size: 20, color: AppColors.textWhite),
                                    onPressed: () {
                                      Navigator.of(context).push(
                                        MaterialPageRoute(builder: (_) => const AlertsScreen()),
                                      );
                                    },
                                  ),
                                ),
                                Positioned(
                                  right: 10,
                                  top: 10,
                                  child: Container(
                                    width: 8,
                                    height: 8,
                                    decoration: const BoxDecoration(
                                      color: AppColors.critical,
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),

                      // Overlapping Today's Sales Card
                      Positioned(
                        left: 16,
                        right: 16,
                        bottom: -32,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
                          decoration: BoxDecoration(
                            color: AppColors.white,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: AppColors.border),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.05),
                                blurRadius: 10,
                                offset: const Offset(0, 4),
                              ),
                            ],
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    "Today's Sales",
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: AppColors.textSecondary,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    'Rs. ${currencyFormatter.format(summary?.todaySales ?? 85400)}',
                                    style: const TextStyle(
                                      fontSize: 24,
                                      fontWeight: FontWeight.w700,
                                      color: AppColors.navy,
                                      letterSpacing: -0.5,
                                    ),
                                  ),
                                ],
                              ),
                              PercentageBadge(
                                percentage: summary?.todaySalesGrowth ?? 12.6,
                                isPositive: (summary?.todaySalesGrowth ?? 12.6) >= 0,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 48),

                  if (isLoading)
                    const Center(
                      child: Padding(
                        padding: EdgeInsets.all(40.0),
                        child: CircularProgressIndicator(color: AppColors.teal),
                      ),
                    )
                  else
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // 2x2 KPI Grid
                          Row(
                            children: [
                              Expanded(
                                child: _buildMetricTile(
                                  icon: LucideIcons.calendar,
                                  label: 'Monthly Sales',
                                  value: summary?.monthlySales != null
                                      ? 'Rs. ${(summary!.monthlySales / 1000000).toStringAsFixed(2)}M'
                                      : 'Rs. 1.82M',
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: _buildMetricTile(
                                  icon: LucideIcons.receipt,
                                  label: 'Transactions',
                                  value: '${summary?.transactionsCount ?? 126}',
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Expanded(
                                child: _buildMetricTile(
                                  icon: LucideIcons.wallet,
                                  label: 'Gross Profit',
                                  value: 'Rs. ${currencyFormatter.format(summary?.grossProfit ?? 186500)}',
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: _buildMetricTile(
                                  icon: LucideIcons.package,
                                  label: 'Inventory Value',
                                  value: summary?.inventoryValue != null
                                      ? 'Rs. ${(summary!.inventoryValue / 1000000).toStringAsFixed(2)}M'
                                      : 'Rs. 4.60M',
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),

                          // Alerts Row (Low Stock & Expiring)
                          Row(
                            children: [
                              Expanded(
                                child: Container(
                                  padding: const EdgeInsets.all(14),
                                  decoration: BoxDecoration(
                                    color: AppColors.warningSoft,
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(color: const Color(0xFFFFE0B2)),
                                  ),
                                  child: Row(
                                    children: [
                                      const Icon(LucideIcons.alertTriangle, size: 20, color: AppColors.warning),
                                      const SizedBox(width: 10),
                                      Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          const Text(
                                            'Low Stock',
                                            style: TextStyle(
                                              fontSize: 11,
                                              fontWeight: FontWeight.w500,
                                              color: AppColors.warning,
                                            ),
                                          ),
                                          Text(
                                            '${summary?.lowStockCount ?? 12}',
                                            style: const TextStyle(
                                              fontSize: 18,
                                              fontWeight: FontWeight.w700,
                                              color: AppColors.warning,
                                            ),
                                          ),
                                        ],
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
                                    color: AppColors.criticalSoft,
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(color: const Color(0xFFFFCDD2)),
                                  ),
                                  child: Row(
                                    children: [
                                      const Icon(LucideIcons.archive, size: 20, color: AppColors.critical),
                                      const SizedBox(width: 10),
                                      Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          const Text(
                                            'Expiring',
                                            style: TextStyle(
                                              fontSize: 11,
                                              fontWeight: FontWeight.w500,
                                              color: AppColors.critical,
                                            ),
                                          ),
                                          Text(
                                            '${summary?.expiringCount ?? 8}',
                                            style: const TextStyle(
                                              fontSize: 18,
                                              fontWeight: FontWeight.w700,
                                              color: AppColors.critical,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 20),

                          // Sales Trend Chart Card
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: AppColors.white,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: AppColors.border),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Sales Trend (Last 7 Days)',
                                  style: TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.navy,
                                  ),
                                ),
                                const SizedBox(height: 18),
                                SizedBox(
                                  height: 140,
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
                                              final days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                                              final idx = value.toInt();
                                              if (idx >= 0 && idx < days.length) {
                                                return Padding(
                                                  padding: const EdgeInsets.only(top: 8.0),
                                                  child: Text(
                                                    days[idx],
                                                    style: const TextStyle(
                                                      fontSize: 11,
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
                                      minX: 0,
                                      maxX: 6,
                                      minY: 30000,
                                      maxY: 95000,
                                      lineBarsData: [
                                        LineChartBarData(
                                          spots: const [
                                            FlSpot(0, 45000),
                                            FlSpot(1, 52000),
                                            FlSpot(2, 49000),
                                            FlSpot(3, 68000),
                                            FlSpot(4, 72000),
                                            FlSpot(5, 64000),
                                            FlSpot(6, 85400),
                                          ],
                                          isCurved: true,
                                          curveSmoothness: 0.35,
                                          color: AppColors.teal,
                                          barWidth: 2.5,
                                          isStrokeCapRound: true,
                                          dotData: FlDotData(
                                            show: true,
                                            checkToShowDot: (spot, barData) => spot.x == 6,
                                            getDotPainter: (spot, percent, barData, index) =>
                                                FlDotCirclePainter(
                                              radius: 4,
                                              color: AppColors.teal,
                                              strokeWidth: 2,
                                              strokeColor: AppColors.white,
                                            ),
                                          ),
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
                          const SizedBox(height: 24),
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

  Widget _buildMetricTile({
    required IconData icon,
    required String label,
    required String value,
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
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: AppColors.tealSoft,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, size: 16, color: AppColors.teal),
          ),
          const SizedBox(height: 10),
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
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: AppColors.navy,
            ),
          ),
        ],
      ),
    );
  }
}
