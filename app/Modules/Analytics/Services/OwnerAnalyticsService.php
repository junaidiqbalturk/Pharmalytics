<?php

namespace App\Modules\Analytics\Services;

use App\Modules\Accounting\Models\ChartOfAccount;
use App\Modules\Catalog\Models\Medicine;
use App\Modules\Foundation\Models\Tenant;
use App\Modules\Inventory\Models\Batch;
use App\Modules\Procurement\Models\PurchaseOrder;
use App\Modules\Sales\Models\Sale;
use App\Modules\Sales\Models\SaleItem;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class OwnerAnalyticsService
{
    /**
     * Module 1: Executive Dashboard summary.
     */
    public function getDashboard(Tenant $tenant): array
    {
        $tz = $tenant->timezone ?: 'UTC';
        $now = Carbon::now($tz);

        // 1. Sales metrics: Today vs Yesterday
        $todayStart = $now->copy()->startOfDay()->utc();
        $todayEnd = $now->copy()->endOfDay()->utc();
        $yesterdayStart = $now->copy()->subDay()->startOfDay()->utc();
        $yesterdayEnd = $now->copy()->subDay()->endOfDay()->utc();

        $todaySales = (float) Sale::query()
            ->where('tenant_id', $tenant->id)
            ->whereBetween('created_at', [$todayStart, $todayEnd])
            ->sum('total_amount');

        $todayCount = Sale::query()
            ->where('tenant_id', $tenant->id)
            ->whereBetween('created_at', [$todayStart, $todayEnd])
            ->count();

        $yesterdaySales = (float) Sale::query()
            ->where('tenant_id', $tenant->id)
            ->whereBetween('created_at', [$yesterdayStart, $yesterdayEnd])
            ->sum('total_amount');

        $todayGrowth = null;
        if ($yesterdaySales > 0) {
            $todayGrowth = round((($todaySales - $yesterdaySales) / $yesterdaySales) * 100, 2);
        } elseif ($todaySales > 0) {
            $todayGrowth = 100.0;
        }

        // 2. Month-to-date sales vs Last month
        $monthStart = $now->copy()->startOfMonth()->utc();
        $monthEnd = $now->copy()->endOfMonth()->utc();
        $lastMonthStart = $now->copy()->subMonth()->startOfMonth()->utc();
        $lastMonthEnd = $now->copy()->subMonth()->endOfMonth()->utc();

        $monthSales = (float) Sale::query()
            ->where('tenant_id', $tenant->id)
            ->whereBetween('created_at', [$monthStart, $monthEnd])
            ->sum('total_amount');

        $lastMonthSales = (float) Sale::query()
            ->where('tenant_id', $tenant->id)
            ->whereBetween('created_at', [$lastMonthStart, $lastMonthEnd])
            ->sum('total_amount');

        $monthGrowth = null;
        if ($lastMonthSales > 0) {
            $monthGrowth = round((($monthSales - $lastMonthSales) / $lastMonthSales) * 100, 2);
        } elseif ($monthSales > 0) {
            $monthGrowth = 100.0;
        }

        // 3. Month Gross Profit & COGS
        $monthCogs = (float) SaleItem::query()
            ->whereHas('sale', function ($q) use ($tenant, $monthStart, $monthEnd): void {
                $q->where('tenant_id', $tenant->id)
                    ->whereBetween('created_at', [$monthStart, $monthEnd]);
            })
            ->selectRaw('SUM(quantity * unit_cost) as total_cogs')
            ->value('total_cogs') ?? 0.0;

        $monthGrossProfit = round($monthSales - $monthCogs, 2);
        $grossMargin = $monthSales > 0 ? round(($monthGrossProfit / $monthSales) * 100, 2) : 0.0;

        // 4. Month Operating Expenses from Journal Entries (type = expense, excluding COGS 5010)
        $monthExpenses = (float) DB::table('journal_entry_items')
            ->join('journal_entries', 'journal_entries.id', '=', 'journal_entry_items.journal_entry_id')
            ->join('chart_of_accounts', 'chart_of_accounts.id', '=', 'journal_entry_items.chart_of_account_id')
            ->where('journal_entries.tenant_id', $tenant->id)
            ->where('chart_of_accounts.type', 'expense')
            ->where('chart_of_accounts.code', '!=', '5010')
            ->whereBetween('journal_entries.date', [$now->copy()->startOfMonth()->toDateString(), $now->copy()->endOfMonth()->toDateString()])
            ->selectRaw("SUM(CASE WHEN journal_entry_items.type = 'debit' THEN journal_entry_items.amount ELSE -journal_entry_items.amount END) as total")
            ->value('total') ?? 0.0;

        $monthNetProfit = round($monthGrossProfit - $monthExpenses, 2);

        // 5. Inventory Valuation (Sum of active, non-expired batch stock * cost_price)
        $inventoryValuation = (float) Batch::query()
            ->where('tenant_id', $tenant->id)
            ->where('is_active', true)
            ->where('expiry_date', '>=', $now->toDateString())
            ->where('quantity', '>', 0)
            ->selectRaw('SUM(quantity * cost_price) as total_val')
            ->value('total_val') ?? 0.0;

        // 6. Outstanding Payables (Account 2010 balance) & Receivables (Account 1100 balance)
        $payables = $this->getAccountBalanceByCode($tenant, '2010');
        $receivables = $this->getAccountBalanceByCode($tenant, '1100');

        // 7. Inventory alert counts
        $inventoryMetrics = $this->getInventoryCounts($tenant, $now);

        // 8. Pending POs count
        $pendingPosCount = PurchaseOrder::query()
            ->where('tenant_id', $tenant->id)
            ->whereIn('status', ['draft', 'partial'])
            ->count();

        // 9. Recent 5 sales
        $recentSales = Sale::query()
            ->where('tenant_id', $tenant->id)
            ->with('customer')
            ->orderBy('id', 'desc')
            ->limit(5)
            ->get()
            ->map(fn (Sale $sale) => [
                'id' => $sale->id,
                'invoice_number' => $sale->invoice_number,
                'customer_name' => $sale->customer?->name ?? 'Walk-in Customer',
                'total_amount' => (string) $sale->total_amount,
                'payment_method' => $sale->payment_method,
                'created_at' => $sale->created_at?->toISOString(),
            ]);

        // 10. Top alerts snippet (first 3)
        $alerts = array_slice($this->getAlerts($tenant), 0, 3);

        return [
            'kpis' => [
                'today_sales' => number_format($todaySales, 2, '.', ''),
                'yesterday_sales' => number_format($yesterdaySales, 2, '.', ''),
                'today_sales_growth_percentage' => $todayGrowth,
                'today_transactions_count' => $todayCount,
                'month_to_date_sales' => number_format($monthSales, 2, '.', ''),
                'last_month_sales' => number_format($lastMonthSales, 2, '.', ''),
                'month_sales_growth_percentage' => $monthGrowth,
                'gross_profit' => number_format($monthGrossProfit, 2, '.', ''),
                'gross_margin_percentage' => $grossMargin,
                'total_expenses' => number_format($monthExpenses, 2, '.', ''),
                'net_profit' => number_format($monthNetProfit, 2, '.', ''),
                'inventory_valuation' => number_format($inventoryValuation, 2, '.', ''),
                'outstanding_payables' => number_format($payables, 2, '.', ''),
                'outstanding_receivables' => number_format($receivables, 2, '.', ''),
            ],
            'alert_counts' => [
                'low_stock_items' => $inventoryMetrics['low_stock_count'],
                'out_of_stock_items' => $inventoryMetrics['out_of_stock_count'],
                'near_expiry_batches' => $inventoryMetrics['near_expiry_count'],
                'expired_batches' => $inventoryMetrics['expired_count'],
                'pending_purchase_orders' => $pendingPosCount,
            ],
            'recent_sales' => $recentSales,
            'top_alerts' => $alerts,
        ];
    }

    /**
     * Module 6 snippet for dashboard alerts.
     */
    public function getAlerts(Tenant $tenant): array
    {
        $tz = $tenant->timezone ?: 'UTC';
        $today = Carbon::now($tz)->toDateString();
        $thirtyDays = Carbon::now($tz)->addDays(30)->toDateString();
        $alerts = [];

        $outOfStockCount = Medicine::query()
            ->where('tenant_id', $tenant->id)
            ->where('is_active', true)
            ->whereDoesntHave('batches', function ($q) use ($today): void {
                $q->where('is_active', true)
                    ->where('quantity', '>', 0)
                    ->where('expiry_date', '>=', $today);
            })
            ->count();

        if ($outOfStockCount > 0) {
            $alerts[] = [
                'id' => 'alert-stock-out',
                'type' => 'out_of_stock',
                'severity' => 'critical',
                'title' => 'Out of Stock Alert',
                'message' => "{$outOfStockCount} active medicines currently have zero stock in inventory.",
                'count' => $outOfStockCount,
                'action_route' => '/inventory',
            ];
        }

        return $alerts;
    }

    /**
     * Compute authoritative general ledger balance for an account by its code.
     */
    protected function getAccountBalanceByCode(Tenant $tenant, string $code): float
    {
        $account = ChartOfAccount::query()
            ->where('tenant_id', $tenant->id)
            ->where('code', $code)
            ->where('is_active', true)
            ->first();

        if (! $account) {
            return 0.0;
        }

        $isCreditNormal = in_array($account->type, ['liability', 'equity', 'revenue'], true);

        $row = DB::table('journal_entry_items')
            ->join('journal_entries', 'journal_entries.id', '=', 'journal_entry_items.journal_entry_id')
            ->where('journal_entries.tenant_id', $tenant->id)
            ->where('journal_entry_items.chart_of_account_id', $account->id)
            ->selectRaw("
                SUM(CASE WHEN journal_entry_items.type = 'debit' THEN journal_entry_items.amount ELSE 0 END) as total_debit,
                SUM(CASE WHEN journal_entry_items.type = 'credit' THEN journal_entry_items.amount ELSE 0 END) as total_credit
            ")
            ->first();

        $debit = (float) ($row?->total_debit ?? 0);
        $credit = (float) ($row?->total_credit ?? 0);

        return $isCreditNormal ? round($credit - $debit, 2) : round($debit - $credit, 2);
    }

    /**
     * Helper to compute batch and medicine stock counts.
     */
    protected function getInventoryCounts(Tenant $tenant, Carbon $now): array
    {
        $today = $now->toDateString();
        $thirtyDays = $now->copy()->addDays(30)->toDateString();

        $medicines = Medicine::query()
            ->where('tenant_id', $tenant->id)
            ->where('is_active', true)
            ->with(['batches' => fn ($q) => $q->where('is_active', true)->where('expiry_date', '>=', $today)])
            ->get();

        $lowCount = 0;
        $outCount = 0;

        foreach ($medicines as $m) {
            $stock = (float) $m->batches->sum('quantity');
            $reorder = (float) ($m->reorder_level ?? 10);
            if ($stock <= 0) {
                $outCount++;
            } elseif ($stock <= $reorder) {
                $lowCount++;
            }
        }

        $nearExpiry = Batch::query()
            ->where('tenant_id', $tenant->id)
            ->where('is_active', true)
            ->where('quantity', '>', 0)
            ->whereBetween('expiry_date', [$today, $thirtyDays])
            ->count();

        $expired = Batch::query()
            ->where('tenant_id', $tenant->id)
            ->where('is_active', true)
            ->where('quantity', '>', 0)
            ->where('expiry_date', '<', $today)
            ->count();

        return [
            'low_stock_count' => $lowCount,
            'out_of_stock_count' => $outCount,
            'near_expiry_count' => $nearExpiry,
            'expired_count' => $expired,
        ];
    }
}
