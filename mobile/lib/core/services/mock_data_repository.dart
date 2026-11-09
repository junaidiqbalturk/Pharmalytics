import '../models/pharmalytics_models.dart';

class MockDataRepository {
  static DashboardSummary getDashboardSummary() {
    return const DashboardSummary(
      todaySales: 85400,
      todaySalesGrowth: 12.6,
      monthlySales: 1820000,
      transactionsCount: 126,
      grossProfit: 186500,
      inventoryValue: 4600000,
      lowStockCount: 12,
      expiringCount: 8,
      salesTrend: [
        SalesTrendPoint(day: 'Mon', value: 45000),
        SalesTrendPoint(day: 'Tue', value: 52000),
        SalesTrendPoint(day: 'Wed', value: 49000),
        SalesTrendPoint(day: 'Thu', value: 68000),
        SalesTrendPoint(day: 'Fri', value: 72000),
        SalesTrendPoint(day: 'Sat', value: 64000),
        SalesTrendPoint(day: 'Sun', value: 85400),
      ],
    );
  }

  static List<Invoice> getInvoices() {
    return [
      Invoice(
        id: '1',
        invoiceNumber: 'INV-01428',
        dateTime: DateTime.now().subtract(const Duration(minutes: 32)),
        customerName: 'Walk-in Customer',
        total: 650,
        subtotal: 560,
        discount: 0,
        tax: 90,
        status: 'Paid',
        items: const [
          InvoiceItem(name: 'Panadol 500mg Tab', quantity: 2, unitPrice: 50, total: 100),
          InvoiceItem(name: 'Amoxicillin 500mg Cap', quantity: 1, unitPrice: 320, total: 320),
          InvoiceItem(name: 'Cetirizine 10mg Tab', quantity: 1, unitPrice: 140, total: 140),
        ],
      ),
      Invoice(
        id: '2',
        invoiceNumber: 'INV-01427',
        dateTime: DateTime.now().subtract(const Duration(hours: 1, minutes: 14)),
        customerName: 'Walk-in Customer',
        total: 3210,
        subtotal: 3000,
        discount: 100,
        tax: 310,
        status: 'Paid',
        items: const [
          InvoiceItem(name: 'Augmentin 625mg Tab', quantity: 2, unitPrice: 1200, total: 2400),
          InvoiceItem(name: 'Panadol Extra', quantity: 4, unitPrice: 150, total: 600),
        ],
      ),
      Invoice(
        id: '3',
        invoiceNumber: 'INV-01426',
        dateTime: DateTime.now().subtract(const Duration(hours: 1, minutes: 48)),
        customerName: 'Ahmad Khan',
        total: 6780,
        subtotal: 6500,
        discount: 200,
        tax: 480,
        status: 'Paid',
        items: const [
          InvoiceItem(name: 'Insulin Glargine', quantity: 1, unitPrice: 4500, total: 4500),
          InvoiceItem(name: 'Needles 4mm Box', quantity: 1, unitPrice: 2000, total: 2000),
        ],
      ),
      Invoice(
        id: '4',
        invoiceNumber: 'INV-01425',
        dateTime: DateTime.now().subtract(const Duration(hours: 15)),
        customerName: 'Dr. Tariq Clinic',
        total: 2450,
        subtotal: 2300,
        discount: 0,
        tax: 150,
        status: 'Credit',
        items: const [
          InvoiceItem(name: 'Normal Saline 1000ml', quantity: 5, unitPrice: 300, total: 1500),
          InvoiceItem(name: 'IV Cannula 22G', quantity: 10, unitPrice: 80, total: 800),
        ],
      ),
      Invoice(
        id: '5',
        invoiceNumber: 'INV-01424',
        dateTime: DateTime.now().subtract(const Duration(hours: 17)),
        customerName: 'Walk-in Customer',
        total: 5920,
        subtotal: 5600,
        discount: 100,
        tax: 420,
        status: 'Paid',
        items: const [
          InvoiceItem(name: 'Lipitor 20mg Tab', quantity: 2, unitPrice: 2800, total: 5600),
        ],
      ),
    ];
  }

  static List<Medicine> getMedicines() {
    return [
      Medicine(
        id: '1',
        name: 'Amoxicillin 500mg Cap',
        sku: 'AMX500',
        stock: 28,
        status: 'Low',
        batchNumber: 'AMX2024-01',
        expiryDate: DateTime(2026, 8, 15),
        unitPrice: 320,
      ),
      Medicine(
        id: '2',
        name: 'Cetirizine 10mg Tab',
        sku: 'CET10',
        stock: 140,
        status: 'Normal',
        batchNumber: 'CET2024-09',
        expiryDate: DateTime(2026, 4, 28),
        unitPrice: 140,
      ),
      Medicine(
        id: '3',
        name: 'Omeprazole 20mg Cap',
        sku: 'OME20',
        stock: 0,
        status: 'Out of Stock',
        batchNumber: 'OME2023-11',
        expiryDate: DateTime(2025, 12, 10),
        unitPrice: 280,
      ),
      Medicine(
        id: '4',
        name: 'Metronidazole 400mg Tab',
        sku: 'MET400',
        stock: 18,
        status: 'Expiring',
        batchNumber: 'MET2305',
        expiryDate: DateTime(2025, 3, 8),
        unitPrice: 180,
      ),
      Medicine(
        id: '5',
        name: 'Panadol 500mg Tab',
        sku: 'PAN500',
        stock: 350,
        status: 'Normal',
        batchNumber: 'PAN2025-01',
        expiryDate: DateTime(2027, 1, 15),
        unitPrice: 50,
      ),
    ];
  }

  static List<PurchaseOrder> getPurchaseOrders() {
    return [
      PurchaseOrder(
        poNumber: 'PO-00872',
        supplierName: 'Healthline Distributors',
        orderDate: DateTime(2025, 3, 24),
        receivedDate: DateTime(2025, 3, 28),
        total: 480000,
        status: 'Received',
        items: const [
          PurchaseOrderItem(
            name: 'Amoxicillin 500mg Cap',
            orderedQty: 1000,
            receivedQty: 1000,
            total: 320000,
          ),
          PurchaseOrderItem(
            name: 'Cetirizine 10mg Tab',
            orderedQty: 500,
            receivedQty: 500,
            total: 70000,
          ),
          PurchaseOrderItem(
            name: 'Omeprazole 20mg Cap',
            orderedQty: 300,
            receivedQty: 300,
            total: 90000,
          ),
        ],
      ),
      PurchaseOrder(
        poNumber: 'PO-00871',
        supplierName: 'Medicon Pharma',
        orderDate: DateTime(2025, 3, 20),
        receivedDate: null,
        total: 220000,
        status: 'Partially Received',
        items: const [
          PurchaseOrderItem(
            name: 'Insulin Glargine',
            orderedQty: 50,
            receivedQty: 25,
            total: 150000,
          ),
          PurchaseOrderItem(
            name: 'Syringes 1ml',
            orderedQty: 1000,
            receivedQty: 1000,
            total: 70000,
          ),
        ],
      ),
    ];
  }

  static FinancialOverviewData getFinancialOverview() {
    return const FinancialOverviewData(
      revenue: 1820000,
      cogs: 1210000,
      grossProfit: 610000,
      expenses: 145000,
      netProfit: 465000,
      netProfitGrowth: 25.6,
      cashBalance: 320000,
      bankBalance: 1240000,
      receivables: 275000,
      payables: 410000,
    );
  }

  static List<NotificationAlert> getAlerts() {
    return const [
      NotificationAlert(
        id: '1',
        title: 'Medicine out of stock',
        description: 'Omeprazole 20mg Cap is out of stock.',
        timestamp: 'Today, 9:58 AM',
        isCritical: true,
        category: 'Stock',
      ),
      NotificationAlert(
        id: '2',
        title: 'Batch expired',
        description: 'Metronidazole 400mg Tab (Batch: MET2305) expired on 08 Mar 2025.',
        timestamp: 'Today, 9:12 AM',
        isCritical: true,
        category: 'Expiry',
      ),
      NotificationAlert(
        id: '3',
        title: 'Low stock',
        description: 'Amoxicillin 500mg Cap (Qty: 18).',
        timestamp: 'Today, 8:46 AM',
        isCritical: false,
        category: 'Stock',
      ),
      NotificationAlert(
        id: '4',
        title: 'Batch expiring soon',
        description: 'Cetirizine 10mg Tab expires on 28 Apr 2025 (in 18 days).',
        timestamp: 'Today, 8:20 AM',
        isCritical: false,
        category: 'Expiry',
      ),
    ];
  }
}
