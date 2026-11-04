<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Accounting\Models\ChartOfAccount;
use App\Modules\Catalog\Models\Medicine;
use App\Modules\Foundation\Models\MedicineCategory;
use App\Modules\Foundation\Models\Tenant;
use App\Modules\Inventory\Models\Batch;
use App\Modules\Sales\Models\Sale;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class OwnerAnalyticsTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;
    protected User $owner;
    protected string $ownerToken;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name' => 'Metro Care Pharmacy',
            'slug' => 'metro-care-pharmacy',
            'currency_code' => 'PKR',
            'timezone' => 'Asia/Karachi',
        ]);

        $this->owner = User::create([
            'name' => 'Dr. Owner',
            'email' => 'owner@metrocare.com',
            'password' => Hash::make('OwnerSecure123!'),
        ]);

        $this->tenant->users()->attach($this->owner, ['is_default' => true]);

        app(PermissionRegistrar::class)->setPermissionsTeamId($this->tenant->id);
        Role::findOrCreate('owner', 'web');
        Role::findOrCreate('cashier', 'web');
        $this->owner->assignRole('owner');

        $this->ownerToken = $this->owner->createToken('owner-mobile')->plainTextToken;

        $accounts = [
            ['code' => '1010', 'name' => 'Cash in Hand', 'type' => 'asset'],
            ['code' => '1020', 'name' => 'Bank Account', 'type' => 'asset'],
            ['code' => '1100', 'name' => 'Accounts Receivable', 'type' => 'asset'],
            ['code' => '1200', 'name' => 'Pharmacy Inventory', 'type' => 'asset'],
            ['code' => '2010', 'name' => 'Accounts Payable', 'type' => 'liability'],
            ['code' => '4010', 'name' => 'Pharmacy Sales Revenue', 'type' => 'revenue'],
            ['code' => '5010', 'name' => 'COGS', 'type' => 'expense'],
            ['code' => '6010', 'name' => 'Staff Salaries', 'type' => 'expense'],
            ['code' => '6020', 'name' => 'Store Rent', 'type' => 'expense'],
        ];

        foreach ($accounts as $acc) {
            ChartOfAccount::create([
                'tenant_id' => $this->tenant->id,
                'code' => $acc['code'],
                'name' => $acc['name'],
                'type' => $acc['type'],
                'is_system' => true,
                'is_active' => true,
            ]);
        }
    }

    public function test_owner_dashboard_returns_authoritative_kpis(): void
    {
        $cat = MedicineCategory::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Analgesics',
            'slug' => 'analgesics',
        ]);

        $medicine = Medicine::create([
            'tenant_id' => $this->tenant->id,
            'medicine_category_id' => $cat->id,
            'name' => 'Panadol 500mg',
            'generic_name' => 'Paracetamol',
            'sku' => 'PAN-500',
            'reorder_level' => 10,
            'cost_price' => 20.00,
            'selling_price' => 30.00,
            'is_active' => true,
        ]);

        $batch = Batch::create([
            'tenant_id' => $this->tenant->id,
            'medicine_id' => $medicine->id,
            'batch_number' => 'B-PAN-01',
            'expiry_date' => now()->addMonths(6)->toDateString(),
            'quantity' => 100,
            'cost_price' => 20.00,
            'selling_price' => 30.00,
            'is_active' => true,
        ]);

        $sale = Sale::create([
            'tenant_id' => $this->tenant->id,
            'invoice_number' => 'INV-TEST-001',
            'subtotal' => 150.00,
            'discount_amount' => 0.00,
            'tax_amount' => 0.00,
            'total_amount' => 150.00,
            'paid_amount' => 150.00,
            'change_amount' => 0.00,
            'payment_method' => 'cash',
            'status' => 'completed',
        ]);

        $sale->items()->create([
            'medicine_id' => $medicine->id,
            'batch_id' => $batch->id,
            'quantity' => 5,
            'unit_type' => 'strip',
            'unit_price' => 30.00,
            'unit_cost' => 20.00,
            'discount' => 0.00,
            'subtotal' => 150.00,
        ]);

        $response = $this->withHeaders([
            'Authorization' => "Bearer {$this->ownerToken}",
            'X-Tenant-ID' => (string) $this->tenant->id,
        ])->getJson('/api/v1/owner/dashboard');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'kpis' => [
                        'today_sales',
                        'yesterday_sales',
                        'today_sales_growth_percentage',
                        'today_transactions_count',
                        'month_to_date_sales',
                        'last_month_sales',
                        'month_sales_growth_percentage',
                        'gross_profit',
                        'gross_margin_percentage',
                        'total_expenses',
                        'net_profit',
                        'inventory_valuation',
                        'outstanding_payables',
                        'outstanding_receivables',
                    ],
                    'alert_counts' => [
                        'low_stock_items',
                        'out_of_stock_items',
                        'near_expiry_batches',
                        'expired_batches',
                        'pending_purchase_orders',
                    ],
                    'recent_sales',
                    'top_alerts',
                ],
            ]);

        $this->assertEquals('150.00', $response->json('data.kpis.today_sales'));
        $this->assertEquals(1, $response->json('data.kpis.today_transactions_count'));
        $this->assertEquals('50.00', $response->json('data.kpis.gross_profit'));
    }
}
