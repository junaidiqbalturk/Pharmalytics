import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/status_badge.dart';
import '../../core/models/pharmalytics_models.dart';
import '../../core/services/api_client.dart';

class MedicinesListScreen extends StatefulWidget {
  final String initialFilter;
  const MedicinesListScreen({super.key, this.initialFilter = 'All'});

  @override
  State<MedicinesListScreen> createState() => _MedicinesListScreenState();
}

class _MedicinesListScreenState extends State<MedicinesListScreen> {
  late String _selectedFilter;
  String _searchQuery = '';
  late Future<List<Medicine>> _medicinesFuture;

  @override
  void initState() {
    super.initState();
    _selectedFilter = widget.initialFilter;
    _loadMedicines();
  }

  void _loadMedicines() {
    _medicinesFuture = ApiClient().fetchMedicines(
      search: _searchQuery.isNotEmpty ? _searchQuery : null,
      status: _selectedFilter != 'All' ? _selectedFilter : null,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: AppBar(
        title: const Text('Medicines'),
        leading: IconButton(
          icon: const Icon(LucideIcons.arrowLeft, size: 20),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: Column(
        children: [
          // Search input
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: SizedBox(
              height: 44,
              child: TextField(
                onSubmitted: (val) {
                  setState(() {
                    _searchQuery = val.trim();
                    _loadMedicines();
                  });
                },
                decoration: InputDecoration(
                  hintText: 'Search by name or SKU...',
                  hintStyle: const TextStyle(fontSize: 13, color: AppColors.textMuted),
                  prefixIcon: const Icon(LucideIcons.search, size: 18, color: AppColors.textMuted),
                  contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 12),
                  filled: true,
                  fillColor: AppColors.white,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(color: AppColors.border),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(color: AppColors.border),
                  ),
                ),
              ),
            ),
          ),
          // Filter Chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: ['All', 'Low Stock', 'Out of Stock', 'Expiring'].map((filter) {
                final isSelected = _selectedFilter == filter;
                return Padding(
                  padding: const EdgeInsets.only(right: 8.0),
                  child: GestureDetector(
                    onTap: () {
                      setState(() {
                        _selectedFilter = filter;
                        _loadMedicines();
                      });
                    },
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
                        filter,
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

          // Medicines List
          Expanded(
            child: FutureBuilder<List<Medicine>>(
              future: _medicinesFuture,
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator(color: AppColors.teal));
                }

                final medicines = (snapshot.data ?? []).where((med) {
                  if (_selectedFilter == 'All') return true;
                  if (_selectedFilter == 'Low Stock') return med.status == 'Low';
                  if (_selectedFilter == 'Out of Stock') return med.status == 'Out of Stock';
                  if (_selectedFilter == 'Expiring') return med.status == 'Expiring';
                  return true;
                }).toList();

                if (medicines.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(LucideIcons.package, size: 48, color: AppColors.textMuted),
                        const SizedBox(height: 12),
                        Text(
                          'No medicines found',
                          style: TextStyle(fontSize: 15, color: AppColors.textSecondary, fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                  );
                }

                return RefreshIndicator(
                  onRefresh: () async {
                    setState(() => _loadMedicines());
                    await _medicinesFuture;
                  },
                  color: AppColors.teal,
                  child: ListView.separated(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                    itemCount: medicines.length,
                    separatorBuilder: (context, index) => const SizedBox(height: 10),
                    itemBuilder: (context, index) {
                      final med = medicines[index];
                      return Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: AppColors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 40,
                              height: 40,
                              decoration: BoxDecoration(
                                color: _getPillBgColor(med.status),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Icon(
                                LucideIcons.pill,
                                size: 20,
                                color: _getPillColor(med.status),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    med.name,
                                    style: const TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.navy,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    'SKU: ${med.sku}',
                                    style: const TextStyle(
                                      fontSize: 11,
                                      color: AppColors.textSecondary,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    'Stock: ${med.stock}',
                                    style: const TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.navy,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                StatusBadge.fromStatus(med.status),
                                const SizedBox(height: 8),
                                const Icon(LucideIcons.chevronRight, size: 16, color: AppColors.textMuted),
                              ],
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Color _getPillBgColor(String status) {
    if (status == 'Low') return AppColors.warningSoft;
    if (status == 'Out of Stock') return AppColors.criticalSoft;
    if (status == 'Expiring') return const Color(0xFFFFF7E6);
    return AppColors.tealSoft;
  }

  Color _getPillColor(String status) {
    if (status == 'Low') return AppColors.warning;
    if (status == 'Out of Stock') return AppColors.critical;
    if (status == 'Expiring') return AppColors.warning;
    return AppColors.teal;
  }
}
