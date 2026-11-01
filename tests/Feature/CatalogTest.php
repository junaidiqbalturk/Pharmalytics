<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Foundation\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class CatalogTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name' => 'Metro Care Pharmacy',
            'slug' => 'metro-care-'.Str::random(6),
            'currency_code' => 'USD',
            'timezone' => 'UTC',
        ]);

        $this->user = User::create([
            'name' => 'Dr. Marcus Welby',
            'email' => 'marcus@metrocare.com',
            'password' => bcrypt('SecurePassword#123'),
        ]);

        $this->tenant->users()->attach($this->user, ['is_default' => true]);

        app(PermissionRegistrar::class)->setPermissionsTeamId($this->tenant->id);

        $role = Role::findOrCreate('owner', 'web');
        $viewPerm = Permission::findOrCreate('catalog.view', 'web');
        $managePerm = Permission::findOrCreate('catalog.manage', 'web');
        $role->syncPermissions([$viewPerm, $managePerm]);
        $this->user->assignRole($role);
    }

    public function test_user_can_list_tenant_medicine_categories(): void
    {
        $this->tenant->medicineCategories()->create([
            'name' => 'Antibiotics',
            'slug' => 'antibiotics',
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->withHeader('X-Tenant-ID', (string) $this->tenant->id)
            ->getJson('/api/v1/medicine-categories');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'name', 'slug', 'description', 'is_active'],
                ],
            ]);
    }

    public function test_user_can_create_medicine_category(): void
    {
        $response = $this->actingAs($this->user, 'sanctum')
            ->withHeader('X-Tenant-ID', (string) $this->tenant->id)
            ->postJson('/api/v1/medicine-categories', [
                'name' => 'Analgesics & Antipyretics',
                'description' => 'Pain relief and fever reduction medications',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.name', 'Analgesics & Antipyretics');

        $this->assertDatabaseHas('medicine_categories', [
            'tenant_id' => $this->tenant->id,
            'name' => 'Analgesics & Antipyretics',
        ]);
    }

    public function test_user_can_create_and_fetch_medicine_master(): void
    {
        $category = $this->tenant->medicineCategories()->create([
            'name' => 'Cardiovascular',
            'slug' => 'cardiovascular',
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->withHeader('X-Tenant-ID', (string) $this->tenant->id)
            ->postJson('/api/v1/medicines', [
                'category_id' => $category->id,
                'name' => 'Atorvastatin 20mg Tablets',
                'generic_name' => 'Atorvastatin Calcium',
                'dosage_form' => 'Tablet',
                'strength' => '20mg',
                'sku' => 'ATV-20-TAB',
                'barcode' => '8901234567890',
                'min_reorder_level' => 50,
                'is_prescription_required' => true,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.name', 'Atorvastatin 20mg Tablets')
            ->assertJsonPath('data.sku', 'ATV-20-TAB');

        $medicineId = $response->json('data.id');

        $getResponse = $this->actingAs($this->user, 'sanctum')
            ->withHeader('X-Tenant-ID', (string) $this->tenant->id)
            ->getJson('/api/v1/medicines/'.$medicineId);

        $getResponse->assertStatus(200)
            ->assertJsonPath('data.generic_name', 'Atorvastatin Calcium');
    }
}
