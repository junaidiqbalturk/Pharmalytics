<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Foundation\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class TenantRbacTest extends TestCase
{
    use RefreshDatabase;

    public function test_cashier_role_has_scoped_pos_access_and_is_blocked_from_accounting(): void
    {
        $tenant = Tenant::create([
            'name' => 'City Care Pharmacy',
            'slug' => 'city-care-pharmacy',
            'currency_code' => 'PKR',
            'timezone' => 'Asia/Karachi',
        ]);

        $cashierUser = User::create([
            'name' => 'Tariq Cashier',
            'email' => 'tariq@citycare.com',
            'password' => Hash::make('Password123!'),
        ]);

        $tenant->users()->attach($cashierUser, ['is_default' => true]);

        // Assign cashier role specifically scoped to this tenant
        app(PermissionRegistrar::class)->setPermissionsTeamId($tenant->id);
        $cashierUser->syncRoles(['cashier']);

        $token = $cashierUser->createToken('test-device')->plainTextToken;

        // 1. Cashier CAN query POS products
        $posResponse = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-ID' => (string) $tenant->id,
        ])->getJson('/api/v1/pos/products');

        $posResponse->assertStatus(200);

        // 2. Cashier is FORBIDDEN from viewing accounting journal entries
        $accountingResponse = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-ID' => (string) $tenant->id,
        ])->getJson('/api/v1/journal-entries');

        $accountingResponse->assertStatus(403);

        // 3. Cashier is FORBIDDEN from viewing purchase orders
        $procurementResponse = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-ID' => (string) $tenant->id,
        ])->getJson('/api/v1/purchase-orders');

        $procurementResponse->assertStatus(403);
    }

    public function test_tenant_staff_endpoint_allows_owner_to_manage_tenant_cashiers(): void
    {
        $tenant = Tenant::create([
            'name' => 'Alpha Pharmacy',
            'slug' => 'alpha-pharmacy',
            'currency_code' => 'PKR',
            'timezone' => 'Asia/Karachi',
        ]);

        $owner = User::create([
            'name' => 'Owner Dr. Usman',
            'email' => 'usman@alphapharma.com',
            'password' => Hash::make('Password123!'),
        ]);

        $tenant->users()->attach($owner, ['is_default' => true]);
        app(PermissionRegistrar::class)->setPermissionsTeamId($tenant->id);
        $owner->syncRoles(['owner']);

        $token = $owner->createToken('owner-device')->plainTextToken;

        // Owner creates a cashier inside this tenant
        $createStaffResponse = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-ID' => (string) $tenant->id,
        ])->postJson('/api/v1/staff', [
            'name' => 'Bilal Cashier',
            'email' => 'bilal@alphapharma.com',
            'password' => 'SecurePass123!',
            'role' => 'cashier',
        ]);

        $createStaffResponse->assertStatus(201)
            ->assertJsonPath('data.name', 'Bilal Cashier')
            ->assertJsonPath('data.roles.0', 'cashier');

        // Check staff list
        $staffListResponse = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-ID' => (string) $tenant->id,
        ])->getJson('/api/v1/staff');

        $staffListResponse->assertStatus(200)
            ->assertJsonCount(2, 'data');
    }
}
