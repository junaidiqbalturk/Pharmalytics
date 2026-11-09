import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

enum BadgeVariant {
  success,
  warning,
  critical,
  neutral,
  info,
}

class StatusBadge extends StatelessWidget {
  final String label;
  final BadgeVariant variant;
  final IconData? icon;
  final bool showDot;

  const StatusBadge({
    super.key,
    required this.label,
    required this.variant,
    this.icon,
    this.showDot = false,
  });

  factory StatusBadge.fromStatus(String status) {
    final s = status.toLowerCase().trim();
    if (s.contains('paid') || s.contains('normal') || s.contains('received')) {
      return StatusBadge(label: status, variant: BadgeVariant.success);
    } else if (s.contains('low') || s.contains('partially') || s.contains('credit') || s.contains('attention')) {
      return StatusBadge(label: status, variant: BadgeVariant.warning);
    } else if (s.contains('out of stock') || s.contains('expired') || s.contains('critical')) {
      return StatusBadge(label: status, variant: BadgeVariant.critical);
    } else if (s.contains('expiring')) {
      return StatusBadge(label: status, variant: BadgeVariant.warning);
    }
    return StatusBadge(label: status, variant: BadgeVariant.neutral);
  }

  @override
  Widget build(BuildContext context) {
    Color bg;
    Color text;

    switch (variant) {
      case BadgeVariant.success:
        bg = const Color(0xFFE6F5F4);
        text = AppColors.teal;
        break;
      case BadgeVariant.warning:
        bg = const Color(0xFFFFF7E6);
        text = AppColors.warning;
        break;
      case BadgeVariant.critical:
        bg = const Color(0xFFFFECEB);
        text = AppColors.critical;
        break;
      case BadgeVariant.info:
        bg = const Color(0xFFEBF8FF);
        text = const Color(0xFF2B6CB0);
        break;
      case BadgeVariant.neutral:
        bg = AppColors.neutralSoft;
        text = AppColors.textSecondary;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (showDot) ...[
            Container(
              width: 6,
              height: 6,
              decoration: BoxDecoration(
                color: text,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 4),
          ],
          if (icon != null) ...[
            Icon(icon, size: 12, color: text),
            const SizedBox(width: 4),
          ],
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: text,
            ),
          ),
        ],
      ),
    );
  }
}

class PercentageBadge extends StatelessWidget {
  final double percentage;
  final bool isPositive;

  const PercentageBadge({
    super.key,
    required this.percentage,
    this.isPositive = true,
  });

  @override
  Widget build(BuildContext context) {
    final color = isPositive ? AppColors.teal : AppColors.critical;
    final bg = isPositive ? const Color(0xFFE6F5F4) : const Color(0xFFFFECEB);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            isPositive ? Icons.arrow_upward : Icons.arrow_downward,
            size: 11,
            color: color,
          ),
          const SizedBox(width: 2),
          Text(
            '${percentage.toStringAsFixed(1)}%',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}
