import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/theme/app_theme.dart';
import '../../core/services/api_client.dart';
import '../purchases/purchases_overview_screen.dart';
import '../alerts/alerts_screen.dart';
import '../auth/login_screen.dart';

class MoreScreen extends StatelessWidget {
  const MoreScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final client = ApiClient();
    final name = client.currentUserName;
    final email = client.currentUserEmail;
    final tenant = client.currentTenantName;
    final initials = name.trim().split(' ').map((p) => p.isNotEmpty ? p[0] : '').take(2).join().toUpperCase();

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: AppBar(
        title: const Text('More Options'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // Profile Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border),
              ),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 26,
                    backgroundColor: AppColors.tealSoft,
                    child: Text(
                      initials.isNotEmpty ? initials : 'PO',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: AppColors.teal,
                      ),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          name,
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: AppColors.navy,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          email,
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppColors.textSecondary,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          tenant,
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w500,
                            color: AppColors.teal,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Icon(LucideIcons.chevronRight, size: 18, color: AppColors.textMuted),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Modules Group
            Container(
              decoration: BoxDecoration(
                color: AppColors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                children: [
                  _buildMenuTile(
                    icon: LucideIcons.shoppingBag,
                    title: 'Purchases & Procurement',
                    subtitle: 'Purchase orders, receipts & suppliers',
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => const PurchasesOverviewScreen(showBackButton: true),
                        ),
                      );
                    },
                  ),
                  const Divider(height: 1, color: AppColors.borderLight),
                  _buildMenuTile(
                    icon: LucideIcons.bell,
                    title: 'Alerts & Notifications',
                    subtitle: 'Stock-out & expiry risk warnings',
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => const AlertsScreen()),
                      );
                    },
                  ),
                  const Divider(height: 1, color: AppColors.borderLight),
                  _buildMenuTile(
                    icon: LucideIcons.store,
                    title: 'Switch Branch / Store',
                    subtitle: 'Manage multi-branch inventory',
                    onTap: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Branch switching view')),
                      );
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Settings & Logout
            Container(
              decoration: BoxDecoration(
                color: AppColors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                children: [
                  _buildMenuTile(
                    icon: LucideIcons.settings,
                    title: 'Settings',
                    subtitle: 'App preferences & security',
                    onTap: () {},
                  ),
                  const Divider(height: 1, color: AppColors.borderLight),
                  _buildMenuTile(
                    icon: LucideIcons.helpCircle,
                    title: 'Help & Support',
                    subtitle: 'Documentation & support contact',
                    onTap: () {},
                  ),
                  const Divider(height: 1, color: AppColors.borderLight),
                  _buildMenuTile(
                    icon: LucideIcons.logOut,
                    title: 'Sign Out',
                    subtitle: 'End current owner session',
                    iconColor: AppColors.critical,
                    titleColor: AppColors.critical,
                    onTap: () async {
                      await ApiClient().logout();
                      if (context.mounted) {
                        Navigator.of(context).pushAndRemoveUntil(
                          MaterialPageRoute(builder: (_) => const LoginScreen()),
                          (route) => false,
                        );
                      }
                    },
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMenuTile({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
    Color? iconColor,
    Color? titleColor,
  }) {
    return ListTile(
      onTap: onTap,
      leading: Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          color: (iconColor ?? AppColors.teal).withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(icon, size: 18, color: iconColor ?? AppColors.teal),
      ),
      title: Text(
        title,
        style: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: titleColor ?? AppColors.navy,
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
