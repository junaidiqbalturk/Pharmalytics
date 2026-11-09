import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../main_navigation_shell.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final PageController _pageController = PageController();
  int _currentPage = 0;

  final List<_OnboardingSlideData> _slides = const [
    _OnboardingSlideData(
      tag: 'REAL-TIME SALES VELOCITY',
      title: 'Pharmacy Intelligence\nIn Your Pocket',
      description:
          'Monitor sales velocity, live invoice totals, and payment breakdowns (Cash, Card, Credit) across all your counter terminals in real time.',
      icon: LucideIcons.trendingUp,
      gradient: [Color(0xFF064E3B), Color(0xFF059669), Color(0xFF0D9488)],
      accentColor: Color(0xFF34D399),
      previewCards: [
        _PreviewCard(title: "Today's Sales", value: 'Live Counter Stream', badge: 'Active POS'),
        _PreviewCard(title: 'Speed Checkout', value: '< 1.5s Hotkeys', badge: 'Zero-Mouse'),
      ],
      features: [
        'Live POS transaction feed',
        'Cash & digital tender splits',
        'Top-selling medicine velocity',
      ],
    ),
    _OnboardingSlideData(
      tag: 'FEFO EXPIRY RADAR',
      title: 'Zero Expiry Losses &\nStock Defense',
      description:
          'First-Expiry-First-Out automation prevents dead inventory. Visual 30, 60, and 90-day radar alerts ensure you return batches before they expire.',
      icon: LucideIcons.packageCheck,
      gradient: [Color(0xFF78350F), Color(0xFFB45309), Color(0xFFD97706)],
      accentColor: Color(0xFFFBBF24),
      previewCards: [
        _PreviewCard(title: 'Expiry Radar', value: '30 / 60 / 90 Days', badge: 'Automated'),
        _PreviewCard(title: 'Stock Protection', value: 'FEFO Dispatch', badge: '0% Waste'),
      ],
      features: [
        'Earliest expiring batch dispatch',
        'Real-time reorder level warnings',
        'Vendor return credit tracking',
      ],
    ),
    _OnboardingSlideData(
      tag: 'AUTOMATED GAAP LEDGER',
      title: 'Automated Financials &\nReal-Time Profitability',
      description:
          'No manual bookkeeping needed. Every sales invoice and stock receipt automatically generates double-entry GAAP journal entries with live P&L and Balance Sheet.',
      icon: LucideIcons.coins,
      gradient: [Color(0xFF0F172A), Color(0xFF1E3A8A), Color(0xFF2563EB)],
      accentColor: Color(0xFF60A5FA),
      previewCards: [
        _PreviewCard(title: 'Gross Margin', value: 'Real COGS Tracked', badge: 'GAAP Live'),
        _PreviewCard(title: 'Cash & Bank', value: 'Auto Reconciliation', badge: 'Real Time'),
      ],
      features: [
        'Instant Net Profit & COGS calculations',
        'Accounts Receivable & Payable aging',
        'Automated Chart of Accounts',
      ],
    ),
    _OnboardingSlideData(
      tag: 'PROCUREMENT & SECURITY',
      title: 'Complete Multi-Branch\n& Supplier Control',
      description:
          'Track purchase orders, goods receipts (GRN), and supplier dues. Multi-tenant partitioning and strict RBAC ensure your cost prices stay confidential.',
      icon: LucideIcons.shieldCheck,
      gradient: [Color(0xFF312E81), Color(0xFF4338CA), Color(0xFF087E78)],
      accentColor: Color(0xFFA5B4FC),
      previewCards: [
        _PreviewCard(title: 'Procurement', value: 'PO & GRN Matching', badge: 'Verified'),
        _PreviewCard(title: 'Role Security', value: 'Owner Partitioned', badge: 'Enterprise'),
      ],
      features: [
        'Purchase orders & goods receipt matching',
        'Supplier outstanding balance ledger',
        'Strict tenant & role-based permissions',
      ],
    ),
  ];

  Future<void> _completeOnboarding() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('has_seen_onboarding', true);

    if (mounted) {
      Navigator.of(context).pushReplacement(
        PageRouteBuilder(
          pageBuilder: (_, _, _) => const MainNavigationShell(),
          transitionsBuilder: (_, animation, _, child) {
            return FadeTransition(opacity: animation, child: child);
          },
          transitionDuration: const Duration(milliseconds: 300),
        ),
      );
    }
  }

  void _nextPage() {
    if (_currentPage < _slides.length - 1) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 400),
        curve: Curves.easeInOutCubic,
      );
    } else {
      _completeOnboarding();
    }
  }

  @override
  Widget build(BuildContext context) {
    final slide = _slides[_currentPage];

    return Scaffold(
      body: AnimatedContainer(
        duration: const Duration(milliseconds: 500),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: slide.gradient,
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              // Top Bar
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // Brand Badge
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
                      ),
                      child: const Row(
                        children: [
                          Icon(LucideIcons.cross, size: 14, color: Colors.white),
                          SizedBox(width: 6),
                          Text(
                            'Pharmalytics Mobile',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: Colors.white,
                              letterSpacing: 0.3,
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (_currentPage < _slides.length - 1)
                      TextButton(
                        onPressed: _completeOnboarding,
                        child: Text(
                          'Skip',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: Colors.white.withValues(alpha: 0.8),
                          ),
                        ),
                      )
                    else
                      const SizedBox(height: 32),
                  ],
                ),
              ),

              // Page View
              Expanded(
                child: PageView.builder(
                  controller: _pageController,
                  itemCount: _slides.length,
                  onPageChanged: (index) => setState(() => _currentPage = index),
                  itemBuilder: (context, index) {
                    final s = _slides[index];
                    return Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Spacer(),

                          // Featured Interactive Card with Glowing Backdrop
                          Center(
                            child: Container(
                              width: double.infinity,
                              padding: const EdgeInsets.all(22),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.12),
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(color: Colors.white.withValues(alpha: 0.25)),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.2),
                                    blurRadius: 20,
                                    offset: const Offset(0, 10),
                                  ),
                                ],
                              ),
                              child: Column(
                                children: [
                                  // Icon Badge
                                  Container(
                                    width: 68,
                                    height: 68,
                                    decoration: BoxDecoration(
                                      color: s.accentColor.withValues(alpha: 0.2),
                                      shape: BoxShape.circle,
                                      border: Border.all(color: s.accentColor.withValues(alpha: 0.4), width: 2),
                                    ),
                                    child: Icon(s.icon, size: 34, color: s.accentColor),
                                  ),
                                  const SizedBox(height: 20),

                                  // 2 Metric Preview Cards
                                  Row(
                                    children: s.previewCards.map((c) {
                                      return Expanded(
                                        child: Container(
                                          margin: const EdgeInsets.symmetric(horizontal: 4),
                                          padding: const EdgeInsets.all(12),
                                          decoration: BoxDecoration(
                                            color: Colors.black.withValues(alpha: 0.25),
                                            borderRadius: BorderRadius.circular(12),
                                            border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
                                          ),
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Row(
                                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                                children: [
                                                  Text(
                                                    c.title,
                                                    style: TextStyle(
                                                      fontSize: 10,
                                                      color: Colors.white.withValues(alpha: 0.7),
                                                      fontWeight: FontWeight.w500,
                                                    ),
                                                  ),
                                                  Container(
                                                    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                                                    decoration: BoxDecoration(
                                                      color: s.accentColor.withValues(alpha: 0.2),
                                                      borderRadius: BorderRadius.circular(4),
                                                    ),
                                                    child: Text(
                                                      c.badge,
                                                      style: TextStyle(
                                                        fontSize: 8,
                                                        color: s.accentColor,
                                                        fontWeight: FontWeight.w700,
                                                      ),
                                                    ),
                                                  ),
                                                ],
                                              ),
                                              const SizedBox(height: 6),
                                              Text(
                                                c.value,
                                                style: const TextStyle(
                                                  fontSize: 13,
                                                  fontWeight: FontWeight.w700,
                                                  color: Colors.white,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      );
                                    }).toList(),
                                  ),
                                  const SizedBox(height: 16),

                                  // Bullet Points
                                  ...s.features.map((f) => Padding(
                                        padding: const EdgeInsets.only(bottom: 6.0),
                                        child: Row(
                                          children: [
                                            Icon(LucideIcons.checkCircle2, size: 14, color: s.accentColor),
                                            const SizedBox(width: 8),
                                            Text(
                                              f,
                                              style: TextStyle(
                                                fontSize: 12,
                                                color: Colors.white.withValues(alpha: 0.9),
                                                fontWeight: FontWeight.w500,
                                              ),
                                            ),
                                          ],
                                        ),
                                      )),
                                ],
                              ),
                            ),
                          ),

                          const Spacer(),

                          // Tag
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: s.accentColor.withValues(alpha: 0.25),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              s.tag,
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: s.accentColor,
                                letterSpacing: 0.8,
                              ),
                            ),
                          ),
                          const SizedBox(height: 12),

                          // Title
                          Text(
                            s.title,
                            style: const TextStyle(
                              fontSize: 26,
                              fontWeight: FontWeight.w800,
                              color: Colors.white,
                              height: 1.2,
                              letterSpacing: -0.5,
                            ),
                          ),
                          const SizedBox(height: 10),

                          // Description
                          Text(
                            s.description,
                            style: TextStyle(
                              fontSize: 13.5,
                              color: Colors.white.withValues(alpha: 0.85),
                              height: 1.45,
                            ),
                          ),

                          const Spacer(),
                        ],
                      ),
                    );
                  },
                ),
              ),

              // Bottom Bar: Dots & Action Button
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 18),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // Dynamic indicators
                    Row(
                      children: List.generate(_slides.length, (index) {
                        final isSelected = _currentPage == index;
                        return AnimatedContainer(
                          duration: const Duration(milliseconds: 300),
                          margin: const EdgeInsets.only(right: 6),
                          width: isSelected ? 28 : 8,
                          height: 8,
                          decoration: BoxDecoration(
                            color: isSelected ? Colors.white : Colors.white.withValues(alpha: 0.3),
                            borderRadius: BorderRadius.circular(4),
                          ),
                        );
                      }),
                    ),

                    // Next / Get Started button
                    SizedBox(
                      height: 48,
                      child: ElevatedButton(
                        onPressed: _nextPage,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.white,
                          foregroundColor: slide.gradient.first,
                          padding: const EdgeInsets.symmetric(horizontal: 22),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          elevation: 4,
                        ),
                        child: Row(
                          children: [
                            Text(
                              _currentPage == _slides.length - 1 ? 'Enter Dashboard' : 'Next',
                              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
                            ),
                            const SizedBox(width: 6),
                            const Icon(LucideIcons.arrowRight, size: 16),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _OnboardingSlideData {
  final String tag;
  final String title;
  final String description;
  final IconData icon;
  final List<Color> gradient;
  final Color accentColor;
  final List<_PreviewCard> previewCards;
  final List<String> features;

  const _OnboardingSlideData({
    required this.tag,
    required this.title,
    required this.description,
    required this.icon,
    required this.gradient,
    required this.accentColor,
    required this.previewCards,
    required this.features,
  });
}

class _PreviewCard {
  final String title;
  final String value;
  final String badge;

  const _PreviewCard({
    required this.title,
    required this.value,
    required this.badge,
  });
}
