class DashboardSummary {
  final double todaySales;
  final double todaySalesGrowth;
  final double monthlySales;
  final int transactionsCount;
  final double grossProfit;
  final double inventoryValue;
  final int lowStockCount;
  final int expiringCount;
  final List<SalesTrendPoint> salesTrend;

  const DashboardSummary({
    required this.todaySales,
    required this.todaySalesGrowth,
    required this.monthlySales,
    required this.transactionsCount,
    required this.grossProfit,
    required this.inventoryValue,
    required this.lowStockCount,
    required this.expiringCount,
    required this.salesTrend,
  });
}

class SalesTrendPoint {
  final String day;
  final double value;

  const SalesTrendPoint({required this.day, required this.value});
}

class InvoiceItem {
  final String name;
  final int quantity;
  final double unitPrice;
  final double total;

  const InvoiceItem({
    required this.name,
    required this.quantity,
    required this.unitPrice,
    required this.total,
  });
}

class Invoice {
  final String id;
  final String invoiceNumber;
  final DateTime dateTime;
  final String customerName;
  final double total;
  final double subtotal;
  final double discount;
  final double tax;
  final String status; // 'Paid', 'Credit', 'Refunded'
  final List<InvoiceItem> items;

  const Invoice({
    required this.id,
    required this.invoiceNumber,
    required this.dateTime,
    required this.customerName,
    required this.total,
    required this.subtotal,
    required this.discount,
    required this.tax,
    required this.status,
    required this.items,
  });
}

class Medicine {
  final String id;
  final String name;
  final String sku;
  final int stock;
  final String status; // 'Normal', 'Low', 'Out of Stock', 'Expiring'
  final String? batchNumber;
  final DateTime? expiryDate;
  final double unitPrice;

  const Medicine({
    required this.id,
    required this.name,
    required this.sku,
    required this.stock,
    required this.status,
    this.batchNumber,
    this.expiryDate,
    required this.unitPrice,
  });
}

class PurchaseOrderItem {
  final String name;
  final int orderedQty;
  final int receivedQty;
  final double total;

  const PurchaseOrderItem({
    required this.name,
    required this.orderedQty,
    required this.receivedQty,
    required this.total,
  });
}

class PurchaseOrder {
  final String poNumber;
  final String supplierName;
  final DateTime orderDate;
  final DateTime? receivedDate;
  final double total;
  final String status; // 'Received', 'Partially Received', 'Pending'
  final List<PurchaseOrderItem> items;

  const PurchaseOrder({
    required this.poNumber,
    required this.supplierName,
    required this.orderDate,
    this.receivedDate,
    required this.total,
    required this.status,
    required this.items,
  });
}

class FinancialOverviewData {
  final double revenue;
  final double cogs;
  final double grossProfit;
  final double expenses;
  final double netProfit;
  final double netProfitGrowth;
  final double cashBalance;
  final double bankBalance;
  final double receivables;
  final double payables;

  const FinancialOverviewData({
    required this.revenue,
    required this.cogs,
    required this.grossProfit,
    required this.expenses,
    required this.netProfit,
    required this.netProfitGrowth,
    required this.cashBalance,
    required this.bankBalance,
    required this.receivables,
    required this.payables,
  });
}

class NotificationAlert {
  final String id;
  final String title;
  final String description;
  final String timestamp;
  final bool isCritical; // critical vs warning/needs attention
  final String category; // 'Stock', 'Expiry', 'Activity'

  const NotificationAlert({
    required this.id,
    required this.title,
    required this.description,
    required this.timestamp,
    required this.isCritical,
    required this.category,
  });
}
