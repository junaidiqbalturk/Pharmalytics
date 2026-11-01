<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Foundation\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class EnterpriseModulesTest extends TestCase
{
    use RefreshDatabase;

    private function createTenantSession(): array
    {
        $tenant = Tenant::query()->create([
            'name' => 'Metro Care Pharmacy',
            'slug' => 'metro-care-pharmacy',
            'currency_code' => 'USD',
            'timezone' => 'UTC',
        ]);

        $user = User::query()->create([
            'name' => 'Pharmacist John',
            'email' => 'john@metrocare.test',
            'password' => bcrypt('Password123!'),
        ]);

        $tenant->users()->attach($user, ['is_default' => true]);

        app(PermissionRegistrar::class)->setPermissionsTeamId($tenant->id);

        $role = Role::findOrCreate('owner', 'web');
        $permissions = collect([
            'catalog.view', 'catalog.manage',
            'master_data.view', 'master_data.manage',
            'inventory.view', 'inventory.manage',
            'procurement.view', 'procurement.manage',
            'sales.view', 'sales.manage',
            'accounting.view', 'accounting.manage',
        ])->map(fn (string $name): Permission => Permission::findOrCreate($name, 'web'));

        $role->syncPermissions($permissions);
        $user->assignRole($role);

        $token = $user->createToken('test-device')->plainTextToken;

        return [
            'tenant' => $tenant,
            'user' => $user,
            'token' => $token,
            'headers' => [
                'Authorization' => "Bearer {$token}",
                'X-Tenant-ID' => (string) $tenant->id,
                'Accept' => 'application/json',
            ],
        ];
    }

    public function test_master_data_crud(): void
    {
        $session = $this->createTenantSession();
        $headers = $session['headers'];

        // 1. Supplier
        $supplierRes = $this->postJson('/api/v1/suppliers', [
            'name' => 'Pfizer Distribution Ltd',
            'contact_person' => 'Jane Doe',
            'email' => 'jane@pfizer.test',
            'phone' => '+1234567890',
            'payment_terms_days' => 30,
        ], $headers);
        $supplierRes->assertStatus(201);
        $supplierId = $supplierRes->json('data.id');

        $this->getJson('/api/v1/suppliers', $headers)
            ->assertStatus(200)
            ->assertJsonFragment(['name' => 'Pfizer Distribution Ltd']);

        // 2. Customer
        $customerRes = $this->postJson('/api/v1/customers', [
            'name' => 'Robert Johnson',
            'phone' => '+1987654321',
            'email' => 'robert@patient.test',
            'credit_limit' => 500,
        ], $headers);
        $customerRes->assertStatus(201);

        // 3. Manufacturer
        $mfgRes = $this->postJson('/api/v1/manufacturers', [
            'name' => 'Novartis Pharma',
            'country' => 'Switzerland',
        ], $headers);
        $mfgRes->assertStatus(201);

        // 4. UOM
        $uomRes = $this->postJson('/api/v1/units-of-measurement', [
            'name' => 'Box',
            'symbol' => 'BOX',
        ], $headers);
        $uomRes->assertStatus(201);
    }

    public function test_end_to_end_procurement_inventory_pos_and_accounting_flow(): void
    {
        $session = $this->createTenantSession();
        $headers = $session['headers'];

        // 1. Setup Master Data
        $supplier = $this->postJson('/api/v1/suppliers', [
            'name' => 'Global Meds Supplier',
        ], $headers)->json('data');

        $customer = $this->postJson('/api/v1/customers', [
            'name' => 'Walk-in Patient',
            'phone' => '555-0199',
        ], $headers)->json('data');

        // 2. Setup Category & Medicine
        $category = $this->postJson('/api/v1/medicine-categories', [
            'name' => 'Antibiotics',
            'slug' => 'antibiotics-e2e',
        ], $headers)->json('data');

        $medicine = $this->postJson('/api/v1/medicines', [
            'medicine_category_id' => $category['id'],
            'name' => 'Amoxicillin 500mg',
            'generic_name' => 'Amoxicillin Trihydrate',
            'sku' => 'AMOX-500-CAP',
            'barcode' => '8901234567890',
            'strength' => '500mg',
            'dosage_form' => 'Capsule',
            'reorder_level' => 20,
        ], $headers)->json('data');

        // 3. Create Purchase Order
        $poRes = $this->postJson('/api/v1/purchase-orders', [
            'supplier_id' => $supplier['id'],
            'order_date' => now()->toDateString(),
            'notes' => 'Urgent replenishment',
            'items' => [
                [
                    'medicine_id' => $medicine['id'],
                    'quantity_ordered' => 100,
                    'unit_price' => 5.00,
                ],
            ],
        ], $headers);
        $poRes->assertStatus(201);
        $po = $poRes->json('data');

        // 4. Goods Receipt (Receiving items -> Automatically updates Batch & Stock Movement!)
        $grnRes = $this->postJson('/api/v1/goods-receipts', [
            'purchase_order_id' => $po['id'],
            'supplier_id' => $supplier['id'],
            'invoice_number' => 'INV-SUP-9988',
            'received_date' => now()->toDateString(),
            'items' => [
                [
                    'medicine_id' => $medicine['id'],
                    'batch_number' => 'BATCH-AMOX-01',
                    'expiry_date' => now()->addYear()->toDateString(),
                    'quantity_received' => 100,
                    'unit_cost' => 5.00,
                    'selling_price' => 10.00,
                ],
            ],
        ], $headers);
        $grnRes->assertStatus(201);

        // 5. Verify Batch in Inventory
        $batchesRes = $this->getJson("/api/v1/batches?medicine_id={$medicine['id']}", $headers);
        $batchesRes->assertStatus(200);
        $batch = $batchesRes->json('data.0');
        $this->assertEquals('100.000', $batch['quantity']);
        $this->assertEquals('10.00', $batch['selling_price']);

        // Verify Stock Movements
        $movementsRes = $this->getJson("/api/v1/stock-movements?medicine_id={$medicine['id']}", $headers);
        $movementsRes->assertStatus(200);
        $this->assertNotEmpty($movementsRes->json('data'));

        // 6. POS Search & Checkout
        $posProducts = $this->getJson('/api/v1/pos/products?search=Amoxicillin', $headers);
        $posProducts->assertStatus(200);
        $this->assertTrue($posProducts->json('data.0.in_stock'));

        $checkoutRes = $this->postJson('/api/v1/pos/checkout', [
            'customer_id' => $customer['id'],
            'discount_amount' => 0,
            'tax_amount' => 0,
            'paid_amount' => 50.00,
            'payment_method' => 'cash',
            'items' => [
                [
                    'medicine_id' => $medicine['id'],
                    'quantity' => 5,
                    'unit_price' => 10.00,
                ],
            ],
        ], $headers);
        $checkoutRes->assertStatus(201);
        $sale = $checkoutRes->json('data');
        $this->assertEquals('50.00', $sale['total_amount']);

        // Verify that batch was automatically decremented to 95!
        $updatedBatch = $this->getJson("/api/v1/batches/{$batch['id']}", $headers)->json('data');
        $this->assertEquals('95.000', $updatedBatch['quantity']);

        // 7. Inventory Stock Adjustment
        $adjRes = $this->postJson('/api/v1/stock-adjustments', [
            'reason' => 'Annual stock take recount',
            'items' => [
                [
                    'medicine_id' => $medicine['id'],
                    'batch_id' => $batch['id'],
                    'system_quantity' => 95,
                    'counted_quantity' => 92,
                    'unit_cost' => 5.00,
                ],
            ],
        ], $headers);
        $adjRes->assertStatus(201);

        $adjustedBatch = $this->getJson("/api/v1/batches/{$batch['id']}", $headers)->json('data');
        $this->assertEquals('92.000', $adjustedBatch['quantity']);

        // 8. Accounting: Chart of Accounts & Balanced Journal Entry
        $cashAccount = $this->postJson('/api/v1/chart-of-accounts', [
            'code' => '1010',
            'name' => 'Cash on Hand',
            'type' => 'asset',
        ], $headers)->json('data');

        $salesAccount = $this->postJson('/api/v1/chart-of-accounts', [
            'code' => '4010',
            'name' => 'Pharmacy Sales Revenue',
            'type' => 'revenue',
        ], $headers)->json('data');

        // Post balanced journal entry (Debit Cash 50, Credit Sales 50)
        $jeRes = $this->postJson('/api/v1/journal-entries', [
            'date' => now()->toDateString(),
            'description' => 'Daily POS Cash Reconciliation',
            'items' => [
                [
                    'chart_of_account_id' => $cashAccount['id'],
                    'type' => 'debit',
                    'amount' => 50.00,
                    'description' => 'Cash received from POS counter',
                ],
                [
                    'chart_of_account_id' => $salesAccount['id'],
                    'type' => 'credit',
                    'amount' => 50.00,
                    'description' => 'Revenue recognized',
                ],
            ],
        ], $headers);
        $jeRes->assertStatus(201);

        // Fetch general ledger for Cash Account
        $ledgerRes = $this->getJson("/api/v1/accounts/{$cashAccount['id']}/ledger", $headers);
        $ledgerRes->assertStatus(200);
        $this->assertEquals('50', $ledgerRes->json('data.final_balance'));
    }
}
