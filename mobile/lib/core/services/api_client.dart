import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../config/app_config.dart';
import '../models/pharmalytics_models.dart';

class ApiClient {
  static final ApiClient _instance = ApiClient._internal();
  factory ApiClient() => _instance;

  late final Dio dio;
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  String? _tenantId;
  String? _currentUserEmail;
  String? _currentUserName;
  String? _currentTenantName;

  String get currentUserEmail => _currentUserEmail ?? 'owner@pharmalytics.com';
  String get currentUserName => _currentUserName ?? 'Pharmacy Owner';
  String get currentTenantName => _currentTenantName ?? 'Main Branch';

  ApiClient._internal() {
    dio = Dio(
      BaseOptions(
        baseUrl: AppConfig.apiBaseUrl,
        connectTimeout: const Duration(seconds: 20),
        receiveTimeout: const Duration(seconds: 20),
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      ),
    );

    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          options.baseUrl = AppConfig.apiBaseUrl;
          final token = await _storage.read(key: 'auth_token');
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          final tenant = _tenantId ?? await _storage.read(key: 'tenant_id');
          if (tenant != null && tenant.isNotEmpty) {
            options.headers['X-Tenant-ID'] = tenant;
          }
          debugPrint('[API] ${options.method} ${options.uri} [Tenant: ${options.headers['X-Tenant-ID']}]');
          return handler.next(options);
        },
        onError: (DioException e, handler) {
          debugPrint('[API Error] ${e.requestOptions.method} ${e.requestOptions.uri} -> Status: ${e.response?.statusCode}, Data: ${e.response?.data}');
          return handler.next(e);
        },
      ),
    );
  }

  void setTenantId(String id) {
    _tenantId = id;
    _storage.write(key: 'tenant_id', value: id);
  }

  Future<String?> getTenantId() async {
    return _tenantId ?? await _storage.read(key: 'tenant_id');
  }

  Future<void> saveToken(String token) async {
    await _storage.write(key: 'auth_token', value: token);
  }

  Future<String?> getToken() async {
    return await _storage.read(key: 'auth_token');
  }

  Future<void> clearAuth() async {
    _tenantId = null;
    _currentUserEmail = null;
    _currentUserName = null;
    _currentTenantName = null;
    await _storage.delete(key: 'auth_token');
    await _storage.delete(key: 'tenant_id');
    await _storage.delete(key: 'user_email');
    await _storage.delete(key: 'user_name');
    await _storage.delete(key: 'tenant_name');
  }

  // 1. Authentication
  Future<Map<String, dynamic>> login(String email, String password, {String deviceName = 'android_mobile'}) async {
    try {
      final response = await dio.post('/auth/login', data: {
        'email': email,
        'password': password,
        'device_name': deviceName,
      });

      final data = response.data['data'] as Map<String, dynamic>;
      final token = data['access_token'] as String;
      var defaultTenant = data['default_tenant_id']?.toString();
      final user = data['user'] as Map<String, dynamic>?;
      final tenants = data['tenants'] as List<dynamic>?;

      if ((defaultTenant == null || defaultTenant == 'null' || defaultTenant.isEmpty) && tenants != null && tenants.isNotEmpty) {
        final first = tenants.first as Map<String, dynamic>;
        defaultTenant = first['id']?.toString();
      }

      await saveToken(token);
      if (defaultTenant != null && defaultTenant.isNotEmpty) {
        setTenantId(defaultTenant);
      }

      if (user != null) {
        _currentUserEmail = user['email']?.toString();
        _currentUserName = user['name']?.toString();
        await _storage.write(key: 'user_email', value: _currentUserEmail ?? '');
        await _storage.write(key: 'user_name', value: _currentUserName ?? '');
      }

      if (tenants != null && tenants.isNotEmpty) {
        final firstTenant = tenants.first as Map<String, dynamic>;
        _currentTenantName = firstTenant['name']?.toString();
        await _storage.write(key: 'tenant_name', value: _currentTenantName ?? '');
      }

      return data;
    } on DioException catch (e) {
      if (e.response != null && e.response?.data is Map) {
        final data = e.response!.data as Map;
        if (data['message'] != null) {
          throw data['message'].toString();
        }
        if (data['errors'] != null && data['errors'] is Map) {
          final errors = data['errors'] as Map;
          final firstError = errors.values.first;
          if (firstError is List && firstError.isNotEmpty) {
            throw firstError.first.toString();
          }
        }
      }
      if (e.type == DioExceptionType.connectionTimeout || e.type == DioExceptionType.receiveTimeout) {
        throw 'The server is waking up or connection timed out. Please try again.';
      }
      if (e.type == DioExceptionType.connectionError) {
        throw 'Cannot connect to server. Please check your internet connection.';
      }
      throw 'Authentication error: ${e.message}';
    } catch (e) {
      throw e.toString();
    }
  }

  Future<void> logout() async {
    try {
      await dio.post('/auth/logout');
    } catch (_) {}
    await clearAuth();
  }

  // 2. Owner Dashboard Summary (Real API data)
  Future<DashboardSummary> fetchDashboardSummary() async {
    try {
      final response = await dio.get('/owner/dashboard');
      final data = response.data['data'] as Map<String, dynamic>;

      final kpis = (data['kpis'] as Map<String, dynamic>?) ?? {};
      final alertCounts = (data['alert_counts'] as Map<String, dynamic>?) ?? {};

      final rawTrend = data['sales_trend'] as List<dynamic>? ?? [];
      final trend = rawTrend.map((t) {
        final m = t as Map<String, dynamic>;
        return SalesTrendPoint(
          day: m['day']?.toString() ?? m['date']?.toString() ?? '',
          value: double.tryParse(m['value']?.toString() ?? m['total']?.toString() ?? '0') ?? 0.0,
        );
      }).toList();

      return DashboardSummary(
        todaySales: double.tryParse(kpis['today_sales']?.toString() ?? '0') ?? 0.0,
        todaySalesGrowth: double.tryParse(kpis['today_sales_growth_percentage']?.toString() ?? '0') ?? 0.0,
        monthlySales: double.tryParse(kpis['month_to_date_sales']?.toString() ?? '0') ?? 0.0,
        transactionsCount: int.tryParse(kpis['today_transactions_count']?.toString() ?? '0') ?? 0,
        grossProfit: double.tryParse(kpis['gross_profit']?.toString() ?? '0') ?? 0.0,
        inventoryValue: double.tryParse(kpis['inventory_valuation']?.toString() ?? '0') ?? 0.0,
        lowStockCount: int.tryParse(alertCounts['low_stock_items']?.toString() ?? '0') ?? 0,
        expiringCount: int.tryParse(alertCounts['near_expiry_batches']?.toString() ?? '0') ?? 0,
        salesTrend: trend,
      );
    } catch (e) {
      debugPrint('[ApiClient] fetchDashboardSummary error: $e');
      rethrow;
    }
  }

  // 3. Sales Summary (Real API data)
  Future<Map<String, dynamic>> fetchSalesSummary({String period = 'this_month'}) async {
    try {
      final response = await dio.get('/owner/sales-summary', queryParameters: {'period': period});
      return response.data['data'] as Map<String, dynamic>;
    } catch (e) {
      debugPrint('[ApiClient] fetchSalesSummary error: $e');
      rethrow;
    }
  }

  // 4. Invoices (Real API data)
  Future<List<Invoice>> fetchInvoices({String? search}) async {
    try {
      final response = await dio.get('/sales', queryParameters: search != null ? {'search': search} : null);
      final rawList = response.data['data'];
      final List<dynamic> list = rawList is List ? rawList : (rawList is Map && rawList['data'] is List ? rawList['data'] : []);

      return list.map((item) {
        final m = item as Map<String, dynamic>;
        final items = (m['items'] as List<dynamic>? ?? []).map((i) {
          final it = i as Map<String, dynamic>;
          return InvoiceItem(
            name: it['medicine_name']?.toString() ?? 'Medicine',
            quantity: int.tryParse(it['quantity']?.toString() ?? '1') ?? 1,
            unitPrice: double.tryParse(it['unit_price']?.toString() ?? '0') ?? 0.0,
            total: double.tryParse(it['subtotal']?.toString() ?? '0') ?? 0.0,
          );
        }).toList();

        return Invoice(
          id: m['id']?.toString() ?? '',
          invoiceNumber: m['invoice_number']?.toString() ?? 'INV-${m['id']}',
          dateTime: DateTime.tryParse(m['created_at']?.toString() ?? '') ?? DateTime.now(),
          customerName: m['customer_name']?.toString() ?? m['customer']?['name']?.toString() ?? 'Walk-in Customer',
          total: double.tryParse(m['total_amount']?.toString() ?? '0') ?? 0.0,
          subtotal: double.tryParse(m['subtotal']?.toString() ?? '0') ?? 0.0,
          discount: double.tryParse(m['discount_amount']?.toString() ?? '0') ?? 0.0,
          tax: double.tryParse(m['tax_amount']?.toString() ?? '0') ?? 0.0,
          status: m['status']?.toString() ?? 'Paid',
          items: items,
        );
      }).toList();
    } catch (e) {
      debugPrint('[ApiClient] fetchInvoices error: $e');
      rethrow;
    }
  }

  // 5. Medicines & Inventory Summary (Real API data)
  Future<List<Medicine>> fetchMedicines({String? search, String? status}) async {
    try {
      final response = await dio.get('/medicines', queryParameters: search != null ? {'search': search} : null);
      final rawList = response.data['data'];
      final List<dynamic> list = rawList is List ? rawList : (rawList is Map && rawList['data'] is List ? rawList['data'] : []);

      return list.map((item) {
        final m = item as Map<String, dynamic>;
        final stock = int.tryParse(m['total_stock']?.toString() ?? m['stock']?.toString() ?? '0') ?? 0;
        final reorder = int.tryParse(m['reorder_level']?.toString() ?? '10') ?? 10;

        String itemStatus = 'Normal';
        if (stock == 0) {
          itemStatus = 'Out of Stock';
        } else if (stock <= reorder) {
          itemStatus = 'Low';
        }

        return Medicine(
          id: m['id']?.toString() ?? '',
          name: m['name']?.toString() ?? '',
          sku: m['sku']?.toString() ?? 'SKU-${m['id']}',
          stock: stock,
          status: itemStatus,
          unitPrice: double.tryParse(m['selling_price']?.toString() ?? '0') ?? 0.0,
        );
      }).toList();
    } catch (e) {
      debugPrint('[ApiClient] fetchMedicines error: $e');
      rethrow;
    }
  }

  // 6. Inventory Summary Counts (Real API data)
  Future<Map<String, dynamic>> fetchInventorySummary() async {
    try {
      final response = await dio.get('/owner/inventory-summary');
      return response.data['data'] as Map<String, dynamic>;
    } catch (e) {
      debugPrint('[ApiClient] fetchInventorySummary error: $e');
      rethrow;
    }
  }

  // 7. Financial Summary (Real API data)
  Future<FinancialOverviewData> fetchFinancialSummary({String period = 'this_month'}) async {
    try {
      final response = await dio.get('/owner/financial-summary', queryParameters: {'period': period});
      final data = response.data['data'] as Map<String, dynamic>;

      final pnl = (data['profit_and_loss'] as Map<String, dynamic>?) ?? {};
      final capital = (data['working_capital_glance'] as Map<String, dynamic>?) ?? {};
      final expensesMap = pnl['operating_expenses'] as Map<String, dynamic>?;

      return FinancialOverviewData(
        revenue: double.tryParse(pnl['net_revenue']?.toString() ?? pnl['gross_sales']?.toString() ?? '0') ?? 0.0,
        cogs: double.tryParse(pnl['cost_of_goods_sold']?.toString() ?? '0') ?? 0.0,
        grossProfit: double.tryParse(pnl['gross_profit']?.toString() ?? '0') ?? 0.0,
        expenses: double.tryParse(expensesMap?['total']?.toString() ?? '0') ?? 0.0,
        netProfit: double.tryParse(pnl['net_profit']?.toString() ?? '0') ?? 0.0,
        netProfitGrowth: double.tryParse(pnl['net_profit_margin_percentage']?.toString() ?? '0') ?? 0.0,
        cashBalance: double.tryParse(capital['cash_in_hand']?.toString() ?? '0') ?? 0.0,
        bankBalance: double.tryParse(capital['bank_balance']?.toString() ?? '0') ?? 0.0,
        receivables: double.tryParse(capital['accounts_receivable']?.toString() ?? '0') ?? 0.0,
        payables: double.tryParse(capital['accounts_payable']?.toString() ?? '0') ?? 0.0,
      );
    } catch (e) {
      debugPrint('[ApiClient] fetchFinancialSummary error: $e');
      rethrow;
    }
  }

  // 8. Alerts (Real API data)
  Future<List<NotificationAlert>> fetchAlerts() async {
    try {
      final response = await dio.get('/owner/alerts');
      final list = (response.data['data'] as List<dynamic>?) ?? [];

      return list.map((item) {
        final m = item as Map<String, dynamic>;
        final severity = m['severity']?.toString() ?? 'warning';
        final count = m['count'] != null ? ' (${m['count']})' : '';
        return NotificationAlert(
          id: m['id']?.toString() ?? '',
          title: (m['title']?.toString() ?? 'Alert') + count,
          description: m['message']?.toString() ?? '',
          timestamp: 'Live Alert',
          isCritical: severity == 'critical',
          category: (m['type']?.toString().contains('stock') ?? false) ? 'Stock' : 'Expiry',
        );
      }).toList();
    } catch (e) {
      debugPrint('[ApiClient] fetchAlerts error: $e');
      rethrow;
    }
  }

  // 9. Purchase Orders (Real API data)
  Future<List<PurchaseOrder>> fetchPurchaseOrders() async {
    try {
      final response = await dio.get('/purchase-orders');
      final rawList = response.data['data'];
      final List<dynamic> list = rawList is List ? rawList : (rawList is Map && rawList['data'] is List ? rawList['data'] : []);

      return list.map((item) {
        final m = item as Map<String, dynamic>;
        final items = (m['items'] as List<dynamic>? ?? []).map((i) {
          final it = i as Map<String, dynamic>;
          return PurchaseOrderItem(
            name: it['medicine_name']?.toString() ?? 'Medicine',
            orderedQty: int.tryParse(it['quantity_ordered']?.toString() ?? '0') ?? 0,
            receivedQty: int.tryParse(it['quantity_received']?.toString() ?? '0') ?? 0,
            total: double.tryParse(it['subtotal']?.toString() ?? '0') ?? 0.0,
          );
        }).toList();

        return PurchaseOrder(
          poNumber: m['po_number']?.toString() ?? 'PO-${m['id']}',
          supplierName: m['supplier']?['name']?.toString() ?? 'Supplier',
          orderDate: DateTime.tryParse(m['order_date']?.toString() ?? '') ?? DateTime.now(),
          receivedDate: DateTime.tryParse(m['received_date']?.toString() ?? ''),
          total: double.tryParse(m['total_amount']?.toString() ?? '0') ?? 0.0,
          status: m['status']?.toString() ?? 'Received',
          items: items,
        );
      }).toList();
    } catch (e) {
      debugPrint('[ApiClient] fetchPurchaseOrders error: $e');
      rethrow;
    }
  }
}
