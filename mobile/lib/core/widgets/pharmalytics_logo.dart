import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class PharmalyticsLogo extends StatelessWidget {
  final double size;
  final bool showText;
  final Color? textColor;
  final double fontSize;

  const PharmalyticsLogo({
    super.key,
    this.size = 56,
    this.showText = true,
    this.textColor,
    this.fontSize = 24,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        CustomPaint(
          size: Size(size, size),
          painter: _LogoCrossPainter(),
        ),
        if (showText) ...[
          const SizedBox(height: 12),
          Text(
            'Pharmalytics',
            style: TextStyle(
              fontSize: fontSize,
              fontWeight: FontWeight.w700,
              color: textColor ?? AppColors.navy,
              letterSpacing: -0.5,
            ),
          ),
        ],
      ],
    );
  }
}

class _LogoCrossPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final double w = size.width;
    final double unit = w / 5;

    final paintLight = Paint()
      ..color = const Color(0xFF38B2AC) // Bright teal-green
      ..style = PaintingStyle.fill;

    final paintDark = Paint()
      ..color = const Color(0xFF0D9488) // Deep teal
      ..style = PaintingStyle.fill;

    // Center vertical bar
    final centerVRect = RRect.fromRectAndRadius(
      Rect.fromLTWH(unit * 1.8, unit * 0.4, unit * 1.4, unit * 4.2),
      Radius.circular(unit * 0.7),
    );

    // Center horizontal bar
    final centerHRect = RRect.fromRectAndRadius(
      Rect.fromLTWH(unit * 0.4, unit * 1.8, unit * 4.2, unit * 1.4),
      Radius.circular(unit * 0.7),
    );

    canvas.drawRRect(centerHRect, paintDark);
    canvas.drawRRect(centerVRect, paintLight);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
