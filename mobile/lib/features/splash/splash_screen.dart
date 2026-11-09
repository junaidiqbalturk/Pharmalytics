import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/pharmalytics_logo.dart';
import '../auth/login_screen.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const LoginScreen()),
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.navy,
      body: Stack(
        children: [
          // Background subtle waves at bottom
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            height: 220,
            child: CustomPaint(
              painter: _SplashWavePainter(),
            ),
          ),
          // Center content
          Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const PharmalyticsLogo(
                  size: 72,
                  showText: false,
                ),
                const SizedBox(height: 20),
                const Text(
                  'Pharmalytics',
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textWhite,
                    letterSpacing: -0.5,
                  ),
                ),
                const SizedBox(height: 10),
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 40),
                  child: Text(
                    'Pharmacy Intelligence for\nSmarter Decisions',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 14,
                      color: Color(0xFF9FB3C8),
                      height: 1.4,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SplashWavePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final path1 = Path();
    path1.moveTo(0, size.height * 0.4);
    path1.quadraticBezierTo(
      size.width * 0.35,
      size.height * 0.1,
      size.width * 0.7,
      size.height * 0.45,
    );
    path1.quadraticBezierTo(
      size.width * 0.88,
      size.height * 0.65,
      size.width,
      size.height * 0.5,
    );
    path1.lineTo(size.width, size.height);
    path1.lineTo(0, size.height);
    path1.close();

    final paint1 = Paint()
      ..color = const Color(0xFF0D5E58).withValues(alpha: 0.4)
      ..style = PaintingStyle.fill;
    canvas.drawPath(path1, paint1);

    final path2 = Path();
    path2.moveTo(0, size.height * 0.6);
    path2.quadraticBezierTo(
      size.width * 0.4,
      size.height * 0.35,
      size.width * 0.75,
      size.height * 0.65,
    );
    path2.quadraticBezierTo(
      size.width * 0.9,
      size.height * 0.8,
      size.width,
      size.height * 0.7,
    );
    path2.lineTo(size.width, size.height);
    path2.lineTo(0, size.height);
    path2.close();

    final paint2 = Paint()
      ..color = const Color(0xFF087E78).withValues(alpha: 0.65)
      ..style = PaintingStyle.fill;
    canvas.drawPath(path2, paint2);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
