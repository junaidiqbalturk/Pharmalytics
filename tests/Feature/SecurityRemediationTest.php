<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Catalog\Models\Medicine;
use App\Modules\Foundation\Models\Tenant;
use App\Modules\Inventory\Models\Batch;
use App\Modules\MasterData\Models\Customer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\URL;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class SecurityRemediationTest extends TestCase
{
    use RefreshDatabase;

    private function createTenantWithOwner(string $name = 'Alpha Pharma'): array
    {
        $tenant = Tenant::create([
            'name' => $name,
            'slug' => \Illuminate\Support\Str::slug($name),
            'currency_code' => 'PKR',
            'timezone' => 'Asia/Karachi',
        ]);

        $owner = User::create([
            'name' => "Owner {$name}",
            'email' => \Illuminate\Support\Str::slug($name).'@pharmalytics.test',
            'password' => Hash::make('OwnerPass123!'),
            'email_verified_at' => now(),
        ]);

        $tenant->users()->attach($owner, ['is_default' => true]);
        app(PermissionRegistrar::class)->setPermissionsTeamId($tenant->id);
        $owner->syncRoles(['owner']);
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $token = $owner->createToken('test-token')->plainTextToken;

        return [
            'tenant' => $tenant,
            'owner' => $owner,
            'token' => $token,
            'headers' => [
                'Authorization' => "Bearer {$token}",
                'X-Tenant-ID' => (string) $tenant->id,
            ],
        ];
    }

    public function test_health_check_endpoint_is_sanitized_and_does_not_leak_schema(): void
    {
        $response = $this->getJson('/health-check');

        $response->assertStatus(200)
            ->assertExactJson(['status' => 'ok']);

        $this->assertArrayNotHasKey('tables', $response->json());
        $this->assertArrayNotHasKey('database', $response->json());
        $this->assertArrayNotHasKey('session_driver', $response->json());
    }

    public function test_owner_can_manage_staff(): void
    {
        ['tenant' => $tenant, 'headers' => $ownerHeaders] = $this->createTenantWithOwner();

        $this->getJson('/api/v1/staff', $ownerHeaders)->assertStatus(200);

        $createRes = $this->postJson('/api/v1/staff', [
            'name' => 'Legit Pharmacist',
            'email' => 'legit.pharm@pharmalytics.test',
            'password' => 'Password123!',
            'role' => 'pharmacist',
        ], $ownerHeaders);

        $createRes->assertStatus(201);
    }

    public function test_cashier_is_forbidden_from_staff_management(): void
    {
        ['tenant' => $tenant] = $this->createTenantWithOwner();

        $cashier = User::create([
            'name' => 'Cashier Test',
            'email' => 'cashier.sec@pharmalytics.test',
            'password' => Hash::make('Cashier123!'),
        ]);
        $tenant->users()->attach($cashier, ['is_default' => true]);
        app(PermissionRegistrar::class)->setPermissionsTeamId($tenant->id);
        $cashier->syncRoles(['cashier']);

        $cashierHeaders = [
            'Authorization' => 'Bearer '.$cashier->createToken('cashier-device')->plainTextToken,
            'X-Tenant-ID' => (string) $tenant->id,
        ];

        // Cashier cannot list or create staff
        $this->getJson('/api/v1/staff', $cashierHeaders)->assertStatus(403);
        $this->postJson('/api/v1/staff', [
            'name' => 'Hacker Account',
            'email' => 'hacker@pharmalytics.test',
            'password' => 'Password123!',
            'role' => 'admin',
        ], $cashierHeaders)->assertStatus(403);
    }

    public function test_cannot_attach_existing_cross_tenant_user_without_invitation(): void
    {
        ['tenant' => $tenantA] = $this->createTenantWithOwner('Tenant Alpha');
        ['tenant' => $tenantB, 'headers' => $headersB] = $this->createTenantWithOwner('Tenant Beta');

        $victim = User::create([
            'name' => 'Victim User',
            'email' => 'victim@tenantalpha.test',
            'password' => Hash::make('Pass123!'),
        ]);
        $tenantA->users()->attach($victim, ['is_default' => true]);

        // Tenant B admin tries to add victim email to Tenant B
        $response = $this->postJson('/api/v1/staff', [
            'name' => 'Victim Impersonator',
            'email' => 'victim@tenantalpha.test',
            'password' => 'NewPass123!',
            'role' => 'cashier',
        ], $headersB);

        $response->assertStatus(422)
            ->assertJsonValidationErrors('email');

        // Confirm victim is NOT attached to Tenant B
        $this->assertFalse($tenantB->users()->whereKey($victim->id)->exists());
    }

    public function test_pos_checkout_rejects_transaction_if_no_batch_or_insufficient_stock(): void
    {
        ['tenant' => $tenant, 'headers' => $headers] = $this->createTenantWithOwner();

        $medicine = Medicine::create([
            'tenant_id' => $tenant->id,
            'name' => 'Panadol 500mg',
            'sku' => 'PAN-500',
            'selling_price' => 15.00,
            'is_active' => true,
        ]);

        // Attempt checkout with NO batch existing in inventory
        $response = $this->postJson('/api/v1/pos/checkout', [
            'paid_amount' => 15.00,
            'payment_method' => 'cash',
            'items' => [
                [
                    'medicine_id' => $medicine->id,
                    'quantity' => 1,
                    'unit_price' => 15.00,
                ],
            ],
        ], $headers);

        $response->assertStatus(422)
            ->assertJsonValidationErrors('items');
    }

    public function test_pos_checkout_uses_authoritative_price_ignoring_browser_tampering(): void
    {
        ['tenant' => $tenant, 'headers' => $headers] = $this->createTenantWithOwner();

        $medicine = Medicine::create([
            'tenant_id' => $tenant->id,
            'name' => 'Augmentin 625mg',
            'sku' => 'AUG-625',
            'selling_price' => 200.00,
            'is_active' => true,
        ]);

        $batch = Batch::create([
            'tenant_id' => $tenant->id,
            'medicine_id' => $medicine->id,
            'batch_number' => 'BATCH-AUG-1',
            'expiry_date' => now()->addYear()->toDateString(),
            'quantity' => 50,
            'selling_price' => 200.00,
            'is_active' => true,
        ]);

        // Attacker modifies unit_price to 1.00 in the browser request payload
        $response = $this->postJson('/api/v1/pos/checkout', [
            'paid_amount' => 200.00,
            'payment_method' => 'cash',
            'items' => [
                [
                    'medicine_id' => $medicine->id,
                    'batch_id' => $batch->id,
                    'quantity' => 1,
                    'unit_price' => 1.00, // Tampered price
                ],
            ],
        ], $headers);

        $response->assertStatus(201);
        $sale = $response->json('data');

        // Total amount MUST be authoritative (200.00), not the manipulated 1.00!
        $this->assertEquals('200.00', $sale['total_amount']);
        $this->assertEquals('200.00', $sale['items'][0]['unit_price']);
    }

    public function test_pos_checkout_enforces_tenant_scoping(): void
    {
        ['tenant' => $tenantA] = $this->createTenantWithOwner('Pharmacy A');
        ['tenant' => $tenantB, 'headers' => $headersB] = $this->createTenantWithOwner('Pharmacy B');

        $foreignMedicine = Medicine::create([
            'tenant_id' => $tenantA->id,
            'name' => 'Pharmacy A Secret Drug',
            'sku' => 'PHARM-A-01',
            'selling_price' => 50.00,
            'is_active' => true,
        ]);

        // Pharmacy B attempts to purchase Pharmacy A's medicine
        $response = $this->postJson('/api/v1/pos/checkout', [
            'paid_amount' => 50.00,
            'payment_method' => 'cash',
            'items' => [
                [
                    'medicine_id' => $foreignMedicine->id,
                    'quantity' => 1,
                    'unit_price' => 50.00,
                ],
            ],
        ], $headersB);

        $response->assertStatus(422)
            ->assertJsonValidationErrors('items.0.medicine_id');
    }

    public function test_stock_adjustment_uses_authoritative_batch_quantity(): void
    {
        ['tenant' => $tenant, 'headers' => $headers] = $this->createTenantWithOwner();

        $medicine = Medicine::create([
            'tenant_id' => $tenant->id,
            'name' => 'Brufen 400mg',
            'sku' => 'BRU-400',
            'is_active' => true,
        ]);

        $batch = Batch::create([
            'tenant_id' => $tenant->id,
            'medicine_id' => $medicine->id,
            'batch_number' => 'BRU-BATCH-99',
            'expiry_date' => now()->addYear()->toDateString(),
            'quantity' => 100, // Actual system quantity in DB is 100
            'is_active' => true,
        ]);

        // Malicious user sends fake system_quantity: 50, counted: 90 to report fake +40 variance instead of true -10
        $response = $this->postJson('/api/v1/stock-adjustments', [
            'reason' => 'Audit variance check',
            'items' => [
                [
                    'medicine_id' => $medicine->id,
                    'batch_id' => $batch->id,
                    'system_quantity' => 50, // Falsified system quantity
                    'counted_quantity' => 90,
                ],
            ],
        ], $headers);

        $response->assertStatus(201);
        $adjustmentItem = $response->json('data.items.0');

        // Backend must record actual system quantity (100) and correct difference (-10)
        $this->assertEquals('100.000', $adjustmentItem['system_quantity']);
        $this->assertEquals('-10.000', $adjustmentItem['difference']);
        $this->assertEquals(90, $batch->fresh()->quantity);
    }

    public function test_email_verification_flow(): void
    {
        $user = User::create([
            'name' => 'Unverified Doctor',
            'email' => 'unverified@pharmalytics.test',
            'password' => Hash::make('Password123!'),
        ]);

        $this->assertFalse($user->hasVerifiedEmail());

        $verificationUrl = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            ['id' => $user->id, 'hash' => sha1($user->getEmailForVerification())]
        );

        $response = $this->getJson($verificationUrl);
        $response->assertStatus(200);

        $this->assertTrue($user->fresh()->hasVerifiedEmail());
    }
}
