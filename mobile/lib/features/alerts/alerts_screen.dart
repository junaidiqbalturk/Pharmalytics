import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/theme/app_theme.dart';
import '../../core/models/pharmalytics_models.dart';
import '../../core/services/api_client.dart';
import '../../core/services/supabase_realtime_service.dart';

class AlertsScreen extends StatefulWidget {
  const AlertsScreen({super.key});

  @override
  State<AlertsScreen> createState() => _AlertsScreenState();
}

class _AlertsScreenState extends State<AlertsScreen> {
  String _selectedCategory = 'All';
  late Future<List<NotificationAlert>> _alertsFuture;

  @override
  void initState() {
    super.initState();
    _loadAlerts();
    SupabaseRealtimeService().addAlertListener(_onRealtimeAlert);
  }

  @override
  void dispose() {
    SupabaseRealtimeService().removeAlertListener(_onRealtimeAlert);
    super.dispose();
  }

  void _onRealtimeAlert(Map<String, dynamic> payload) {
    if (mounted) {
      _loadAlerts();
      setState(() {});
    }
  }

  void _loadAlerts() {
    _alertsFuture = ApiClient().fetchAlerts();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: AppBar(
        title: const Text('Alerts & Notifications'),
        leading: IconButton(
          icon: const Icon(LucideIcons.arrowLeft, size: 20),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: Column(
        children: [
          // Filter Chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              children: ['All', 'Stock', 'Expiry', 'Activity'].map((cat) {
                final isSelected = _selectedCategory == cat;
                return Padding(
                  padding: const EdgeInsets.only(right: 8.0),
                  child: GestureDetector(
                    onTap: () => setState(() => _selectedCategory = cat),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                      decoration: BoxDecoration(
                        color: isSelected ? AppColors.teal : AppColors.white,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: isSelected ? AppColors.teal : AppColors.border,
                        ),
                      ),
                      child: Text(
                        cat,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                          color: isSelected ? AppColors.white : AppColors.textPrimary,
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),

          // Alerts List
          Expanded(
            child: FutureBuilder<List<NotificationAlert>>(
              future: _alertsFuture,
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator(color: AppColors.teal));
                }

                final allAlerts = snapshot.data ?? [];
                final filteredAlerts = allAlerts.where((a) {
                  if (_selectedCategory == 'All') return true;
                  return a.category == _selectedCategory;
                }).toList();

                final criticalAlerts = filteredAlerts.where((a) => a.isCritical).toList();
                final attentionAlerts = filteredAlerts.where((a) => !a.isCritical).toList();

                if (filteredAlerts.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(LucideIcons.bellOff, size: 48, color: AppColors.textMuted),
                        const SizedBox(height: 12),
                        const Text(
                          'No alerts found',
                          style: TextStyle(fontSize: 15, color: AppColors.textSecondary, fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                  );
                }

                return RefreshIndicator(
                  onRefresh: () async {
                    setState(() => _loadAlerts());
                    await _alertsFuture;
                  },
                  color: AppColors.teal,
                  child: ListView(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                    children: [
                      // Critical Section
                      if (criticalAlerts.isNotEmpty) ...[
                        Row(
                          children: [
                            const Icon(LucideIcons.alertCircle, size: 16, color: AppColors.critical),
                            const SizedBox(width: 6),
                            Text(
                              'Critical (${criticalAlerts.length})',
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: AppColors.critical,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        ...criticalAlerts.map((a) => _buildAlertCard(
                              title: a.title,
                              description: a.description,
                              time: a.timestamp,
                              icon: LucideIcons.alertTriangle,
                              iconColor: AppColors.critical,
                              bgColor: AppColors.criticalSoft,
                            )),
                        const SizedBox(height: 18),
                      ],

                      // Needs Attention Section
                      if (attentionAlerts.isNotEmpty) ...[
                        Row(
                          children: [
                            const Icon(LucideIcons.alertTriangle, size: 16, color: AppColors.warning),
                            const SizedBox(width: 6),
                            Text(
                              'Needs Attention (${attentionAlerts.length})',
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: AppColors.warning,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        ...attentionAlerts.map((a) => _buildAlertCard(
                              title: a.title,
                              description: a.description,
                              time: a.timestamp,
                              icon: LucideIcons.clock,
                              iconColor: AppColors.warning,
                              bgColor: AppColors.warningSoft,
                            )),
                      ],
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAlertCard({
    required String title,
    required String description,
    required String time,
    required IconData icon,
    required Color iconColor,
    required Color bgColor,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: bgColor,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, size: 16, color: iconColor),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppColors.navy,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  description,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.textSecondary,
                    height: 1.3,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  time,
                  style: const TextStyle(
                    fontSize: 10,
                    color: AppColors.textMuted,
                  ),
                ),
              ],
            ),
          ),
          const Icon(LucideIcons.chevronRight, size: 16, color: AppColors.textMuted),
        ],
      ),
    );
  }
}
