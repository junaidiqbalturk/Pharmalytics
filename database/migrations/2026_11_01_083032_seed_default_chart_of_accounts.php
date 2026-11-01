<?php

use App\Modules\Accounting\Models\ChartOfAccount;
use App\Modules\Foundation\Models\Tenant;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        $defaults = [
            ['code' => '1010', 'name' => 'Cash in Hand (Counter Till)', 'type' => 'asset'],
            ['code' => '1020', 'name' => 'Bank Account (Main Operational)', 'type' => 'asset'],
            ['code' => '1100', 'name' => 'Accounts Receivable (Customer Credit)', 'type' => 'asset'],
            ['code' => '1200', 'name' => 'Pharmacy Inventory (Stock on Hand)', 'type' => 'asset'],
            ['code' => '2010', 'name' => 'Accounts Payable (Suppliers)', 'type' => 'liability'],
            ['code' => '2020', 'name' => 'Sales Tax / GST Payable', 'type' => 'liability'],
            ['code' => '3010', 'name' => "Owner's Equity & Capital", 'type' => 'equity'],
            ['code' => '4010', 'name' => 'Pharmacy OTC Medicine Sales', 'type' => 'revenue'],
            ['code' => '4020', 'name' => 'Prescription Sales Revenue', 'type' => 'revenue'],
            ['code' => '5010', 'name' => 'Cost of Goods Sold (COGS - Medicines)', 'type' => 'expense'],
            ['code' => '6010', 'name' => 'Staff Salaries & Wages', 'type' => 'expense'],
            ['code' => '6020', 'name' => 'Store Rent Expense', 'type' => 'expense'],
            ['code' => '6030', 'name' => 'Utilities & Electricity', 'type' => 'expense'],
            ['code' => '6040', 'name' => 'Damaged & Expired Medicine Loss', 'type' => 'expense'],
        ];

        $tenants = Tenant::all();
        foreach ($tenants as $tenant) {
            foreach ($defaults as $account) {
                ChartOfAccount::firstOrCreate(
                    [
                        'tenant_id' => $tenant->id,
                        'code' => $account['code'],
                    ],
                    [
                        'name' => $account['name'],
                        'type' => $account['type'],
                        'is_system' => true,
                        'is_active' => true,
                    ]
                );
            }
        }
    }

    public function down(): void
    {
        // Safe no-op
    }
};
