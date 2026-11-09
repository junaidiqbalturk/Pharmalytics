<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Catalog\Models\Medicine;
use App\Modules\Foundation\Models\MedicineCategory;
use App\Modules\Foundation\Models\Tenant;
use App\Modules\Inventory\Models\Batch;
use App\Modules\Inventory\Models\StockMovement;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class MedicineBulkImportTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User $owner;
    private User $cashier;
    private string $ownerToken;
    private string $cashierToken;

    protected function setUp(): void
    {
        parent::setUp();

        // Seed roles & permissions
        $permCatalogView = Permission::firstOrCreate(['name' => 'catalog.view', 'guard_name' => 'web']);
        $permCatalogManage = Permission::firstOrCreate(['name' => 'catalog.manage', 'guard_name' => 'web']);

        $roleOwner = Role::firstOrCreate(['name' => 'owner', 'guard_name' => 'web']);
        $roleOwner->givePermissionTo([$permCatalogView, $permCatalogManage]);

        $roleCashier = Role::firstOrCreate(['name' => 'cashier', 'guard_name' => 'web']);
        $roleCashier->givePermissionTo([$permCatalogView]);

        $this->tenant = Tenant::create([
            'name' => 'Sehat Pharmacy',
            'slug' => 'sehat-pharma',
            'currency_code' => 'PKR',
            'timezone' => 'Asia/Karachi',
        ]);

        $this->owner = User::create([
            'name' => 'Dr. Owner',
            'email' => 'owner@sehat.test',
            'password' => Hash::make('OwnerPass123!'),
            'email_verified_at' => now(),
        ]);
        $this->tenant->users()->attach($this->owner, ['is_default' => true]);
        app(PermissionRegistrar::class)->setPermissionsTeamId($this->tenant->id);
        $this->owner->syncRoles(['owner']);
        $this->ownerToken = $this->owner->createToken('owner-token')->plainTextToken;

        $this->cashier = User::create([
            'name' => 'Cashier Ali',
            'email' => 'ali@sehat.test',
            'password' => Hash::make('Cashier123!'),
            'email_verified_at' => now(),
        ]);
        $this->tenant->users()->attach($this->cashier, ['is_default' => true]);
        app(PermissionRegistrar::class)->setPermissionsTeamId($this->tenant->id);
        $this->cashier->syncRoles(['cashier']);
        $this->cashierToken = $this->cashier->createToken('cashier-token')->plainTextToken;

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function test_user_can_download_import_template_with_sample_headers_and_rows(): void
    {
        $response = $this->withHeaders([
            'Authorization' => "Bearer {$this->ownerToken}",
            'X-Tenant-ID' => (string) $this->tenant->id,
        ])->get('/api/v1/medicines/import-template');

        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
        $content = $response->getContent();

        $this->assertStringContainsString('category,name,generic_name,sku,barcode', $content);
        $this->assertStringContainsString('Panadol 500mg Tablets', $content);
        $this->assertStringContainsString('Augmentin 156.25mg/5ml Syrup', $content);
    }

    public function test_can_bulk_import_medicines_with_categories_and_batches(): void
    {
        $csvContent = implode("\n", [
            'category,name,generic_name,sku,barcode,strength,dosage_form,packaging_type,is_divisible,package_label,tablets_per_strip,strips_per_box,cost_price,selling_price,reorder_level,batch_number,expiry_date,opening_stock',
            'Analgesics,Panadol Extra,Paracetamol + Caffeine,PAN-EXT-01,89640001,500mg,Tablet,blister,yes,Strip,10,20,35.00,45.00,10,B-PAN-01,2027-12-31,100',
            'Antibiotics,Augmentin DS Syrup,Amoxicillin + Clav,AUG-DS-01,89640002,312.5mg/5ml,Syrup,bottle,no,Bottle,1,1,280.00,340.00,5,B-AUG-01,2026-10-31,30',
        ]);

        $file = UploadedFile::fake()->createWithContent('inventory.csv', $csvContent);

        $response = $this->withHeaders([
            'Authorization' => "Bearer {$this->ownerToken}",
            'X-Tenant-ID' => (string) $this->tenant->id,
        ])->postJson('/api/v1/medicines/import', [
            'file' => $file,
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'summary' => [
                'total_rows' => 2,
                'created_medicines' => 2,
                'updated_medicines' => 0,
                'created_batches' => 2,
                'failed_rows' => 0,
            ],
            'errors' => [],
        ]);

        // Verify Categories were automatically resolved
        $this->assertDatabaseHas('medicine_categories', [
            'tenant_id' => $this->tenant->id,
            'name' => 'Analgesics',
            'slug' => 'analgesics',
        ]);
        $this->assertDatabaseHas('medicine_categories', [
            'tenant_id' => $this->tenant->id,
            'name' => 'Antibiotics',
            'slug' => 'antibiotics',
        ]);

        // Verify Panadol created as divisible blister
        $this->assertDatabaseHas('medicines', [
            'tenant_id' => $this->tenant->id,
            'name' => 'Panadol Extra',
            'sku' => 'PAN-EXT-01',
            'packaging_type' => 'blister',
            'is_divisible' => true,
            'package_label' => 'Strip',
            'selling_price' => '45.00',
        ]);

        // Verify Augmentin created as non-divisible bottle
        $this->assertDatabaseHas('medicines', [
            'tenant_id' => $this->tenant->id,
            'name' => 'Augmentin DS Syrup',
            'sku' => 'AUG-DS-01',
            'packaging_type' => 'bottle',
            'is_divisible' => false,
            'package_label' => 'Bottle',
            'selling_price' => '340.00',
        ]);

        // Verify opening stock batches and movements
        $panadolMed = Medicine::where('tenant_id', $this->tenant->id)->where('sku', 'PAN-EXT-01')->first();
        $this->assertDatabaseHas('batches', [
            'tenant_id' => $this->tenant->id,
            'medicine_id' => $panadolMed->id,
            'batch_number' => 'B-PAN-01',
            'quantity' => '100.000',
        ]);
        $this->assertDatabaseHas('stock_movements', [
            'tenant_id' => $this->tenant->id,
            'medicine_id' => $panadolMed->id,
            'type' => 'opening_stock',
            'quantity' => '100.000',
        ]);

        $augmentinMed = Medicine::where('tenant_id', $this->tenant->id)->where('sku', 'AUG-DS-01')->first();
        $this->assertDatabaseHas('batches', [
            'tenant_id' => $this->tenant->id,
            'medicine_id' => $augmentinMed->id,
            'batch_number' => 'B-AUG-01',
            'quantity' => '30.000',
        ]);
    }

    public function test_import_reports_row_level_validation_errors_without_crashing_valid_rows(): void
    {
        $csvContent = implode("\n", [
            'category,name,selling_price,opening_stock',
            'Dermatology,Valid Ointment,150.00,10',
            'Dermatology,,200.00,10', // Missing name
            'Dermatology,Invalid Price Item,-50.00,10', // Negative price
        ]);

        $file = UploadedFile::fake()->createWithContent('partial.csv', $csvContent);

        $response = $this->withHeaders([
            'Authorization' => "Bearer {$this->ownerToken}",
            'X-Tenant-ID' => (string) $this->tenant->id,
        ])->postJson('/api/v1/medicines/import', [
            'file' => $file,
        ]);

        $response->assertStatus(200);
        $json = $response->json();

        $this->assertFalse($json['success']);
        $this->assertEquals(3, $json['summary']['total_rows']);
        $this->assertEquals(1, $json['summary']['created_medicines']);
        $this->assertEquals(2, $json['summary']['failed_rows']);
        $this->assertCount(2, $json['errors']);

        // Valid row must still be saved
        $this->assertDatabaseHas('medicines', [
            'tenant_id' => $this->tenant->id,
            'name' => 'Valid Ointment',
            'selling_price' => '150.00',
        ]);
    }

    public function test_cashier_cannot_import_inventory(): void
    {
        $file = UploadedFile::fake()->createWithContent('test.csv', "name,selling_price\nBrufen,100");

        $response = $this->withHeaders([
            'Authorization' => "Bearer {$this->cashierToken}",
            'X-Tenant-ID' => (string) $this->tenant->id,
        ])->postJson('/api/v1/medicines/import', [
            'file' => $file,
        ]);

        $response->assertStatus(403);
    }
}
