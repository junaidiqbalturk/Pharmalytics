<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Catalog\Models\Medicine;
use App\Modules\Foundation\Models\Tenant;
use App\Modules\Inventory\Models\Batch;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class PackagingAndDispensingTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User $cashier;
    private User $owner;
    private string $ownerToken;
    private string $cashierToken;

    protected function setUp(): void
    {
        parent::setUp();

        // Seed roles for teams
        Role::firstOrCreate(['name' => 'owner', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'cashier', 'guard_name' => 'web']);

        $this->tenant = Tenant::create([
            'name' => 'Apex Pharmacy',
            'slug' => 'apex-pharma',
            'currency_code' => 'PKR',
            'timezone' => 'Asia/Karachi',
            'max_discount_percentage' => 20.00,
        ]);

        $this->owner = User::create([
            'name' => 'Owner Apex',
            'email' => 'owner@apex.test',
            'password' => Hash::make('Secret123!'),
            'email_verified_at' => now(),
        ]);
        $this->tenant->users()->attach($this->owner, ['is_default' => true]);
        app(PermissionRegistrar::class)->setPermissionsTeamId($this->tenant->id);
        $this->owner->syncRoles(['owner']);
        $this->ownerToken = $this->owner->createToken('owner-token')->plainTextToken;

        $this->cashier = User::create([
            'name' => 'Cashier Apex',
            'email' => 'cashier@apex.test',
            'password' => Hash::make('Secret123!'),
            'email_verified_at' => now(),
        ]);
        $this->tenant->users()->attach($this->cashier, ['is_default' => true]);
        app(PermissionRegistrar::class)->setPermissionsTeamId($this->tenant->id);
        $this->cashier->syncRoles(['cashier']);
        $this->cashierToken = $this->cashier->createToken('cashier-token')->plainTextToken;

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function test_can_create_medicine_with_packaging_type_and_divisible_flag(): void
    {
        $response = $this->withHeaders([
            'Authorization' => "Bearer {$this->ownerToken}",
            'X-Tenant-ID' => (string) $this->tenant->id,
        ])->postJson('/api/v1/medicines', [
            'name' => 'Augmentin 156.25mg/5ml Syrup',
            'generic_name' => 'Amoxicillin + Clavulanate Potassium',
            'sku' => 'AUG-SYR-156',
            'dosage_form' => 'Syrup',
            'packaging_type' => 'bottle',
            'is_divisible' => false,
            'package_label' => 'Bottle',
            'cost_price' => 180.00,
            'selling_price' => 220.00,
            'initial_stock' => 15,
            'batch_number' => 'B-AUG-01',
            'expiry_date' => now()->addYear()->toDateString(),
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('medicines', [
            'tenant_id' => $this->tenant->id,
            'name' => 'Augmentin 156.25mg/5ml Syrup',
            'packaging_type' => 'bottle',
            'is_divisible' => false,
            'package_label' => 'Bottle',
        ]);
    }

    public function test_pos_products_search_returns_packaging_metadata(): void
    {
        $medicine = Medicine::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Augmentin Syrup',
            'sku' => 'AUG-SYR-001',
            'dosage_form' => 'Syrup',
            'packaging_type' => 'bottle',
            'is_divisible' => false,
            'package_label' => 'Bottle',
            'selling_price' => 220.00,
            'is_active' => true,
        ]);

        Batch::create([
            'tenant_id' => $this->tenant->id,
            'medicine_id' => $medicine->id,
            'batch_number' => 'BATCH-BOT-1',
            'quantity' => 10,
            'cost_price' => 180.00,
            'selling_price' => 220.00,
            'expiry_date' => now()->addMonths(6)->toDateString(),
            'is_active' => true,
        ]);

        $response = $this->withHeaders([
            'Authorization' => "Bearer {$this->cashierToken}",
            'X-Tenant-ID' => (string) $this->tenant->id,
        ])->getJson('/api/v1/pos/products?search=Augmentin');

        $response->assertStatus(200);
        $data = $response->json('data.0');
        $this->assertEquals('Augmentin Syrup', $data['name']);
        $this->assertEquals('bottle', $data['packaging_type']);
        $this->assertFalse($data['is_divisible']);
        $this->assertEquals('Bottle', $data['package_label']);
    }

    public function test_pos_checkout_dispenses_sealed_bottle_accurately_without_strip_fraction(): void
    {
        // Augmentin Syrup in bottles: initial stock = 10 bottles
        $syrup = Medicine::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Augmentin 156.25mg Syrup',
            'sku' => 'AUG-SYR-002',
            'dosage_form' => 'Syrup',
            'packaging_type' => 'bottle',
            'is_divisible' => false,
            'package_label' => 'Bottle',
            'tablets_per_strip' => 10, // Should NOT be used for bottles!
            'selling_price' => 250.00,
            'is_active' => true,
        ]);

        $batch = Batch::create([
            'tenant_id' => $this->tenant->id,
            'medicine_id' => $syrup->id,
            'batch_number' => 'BATCH-SYR-001',
            'quantity' => 10,
            'cost_price' => 200.00,
            'selling_price' => 250.00,
            'expiry_date' => now()->addMonths(6)->toDateString(),
            'is_active' => true,
        ]);

        // Cashier sells 2 bottles of syrup
        $response = $this->withHeaders([
            'Authorization' => "Bearer {$this->cashierToken}",
            'X-Tenant-ID' => (string) $this->tenant->id,
        ])->postJson('/api/v1/pos/checkout', [
            'paid_amount' => 500.00,
            'payment_method' => 'cash',
            'items' => [
                [
                    'medicine_id' => $syrup->id,
                    'batch_id' => $batch->id,
                    'quantity' => 2,
                    'unit_type' => 'bottle',
                ],
            ],
        ]);

        $response->assertStatus(201);
        $sale = $response->json('data');

        // Total should be exactly 2 * 250 = 500
        $this->assertEquals('500.00', $sale['total_amount']);

        // Batch stock must have deducted exactly 2 bottles (10 - 2 = 8), NOT 2 / 10 = 0.2!
        $batch->refresh();
        $this->assertEquals('8.000', (string) $batch->quantity);

        // Sale item unit_type should be preserved as 'bottle'
        $this->assertDatabaseHas('sale_items', [
            'medicine_id' => $syrup->id,
            'batch_id' => $batch->id,
            'unit_type' => 'bottle',
            'quantity' => 2,
            'unit_price' => '250.00',
            'subtotal' => '500.00',
        ]);
    }

    public function test_pos_checkout_retains_divisible_strip_and_tablet_dispensing(): void
    {
        // Panadol tablets in blister strips (10 tablets per strip)
        $panadol = Medicine::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Panadol 500mg Tablets',
            'sku' => 'PAN-TAB-500',
            'dosage_form' => 'Tablet',
            'packaging_type' => 'blister',
            'is_divisible' => true,
            'tablets_per_strip' => 10,
            'strips_per_box' => 20,
            'selling_price' => 40.00, // PKR 40 per strip
            'price_per_strip' => 40.00,
            'price_per_unit' => 4.00, // PKR 4 per loose tablet (goli)
            'is_active' => true,
        ]);

        $batch = Batch::create([
            'tenant_id' => $this->tenant->id,
            'medicine_id' => $panadol->id,
            'batch_number' => 'BATCH-PAN-01',
            'quantity' => 50, // 50 strips
            'cost_price' => 30.00,
            'selling_price' => 40.00,
            'expiry_date' => now()->addYear()->toDateString(),
            'is_active' => true,
        ]);

        // Customer buys 5 loose tablets (goli)
        $response = $this->withHeaders([
            'Authorization' => "Bearer {$this->cashierToken}",
            'X-Tenant-ID' => (string) $this->tenant->id,
        ])->postJson('/api/v1/pos/checkout', [
            'paid_amount' => 20.00,
            'payment_method' => 'cash',
            'items' => [
                [
                    'medicine_id' => $panadol->id,
                    'batch_id' => $batch->id,
                    'quantity' => 5,
                    'unit_type' => 'unit', // Loose tablet
                ],
            ],
        ]);

        $response->assertStatus(201);
        $sale = $response->json('data');

        // Total should be 5 tablets * PKR 4 = PKR 20
        $this->assertEquals('20.00', $sale['total_amount']);

        // Stock deduction for 5 tablets (tablets_per_strip = 10) = 0.5 strips
        // 50 - 0.5 = 49.5 strips remaining
        $batch->refresh();
        $this->assertEquals('49.500', (string) $batch->quantity);
    }
}
