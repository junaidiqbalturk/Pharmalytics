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

    public function test_pos_checkout_rejects_unpriced_inventory_by_default(): void
    {
        ['tenant' => $tenant, 'headers' => $headers] = $this->createTenantWithOwner('Unpriced Pharma');

        $medicine = Medicine::create([
            'tenant_id' => $tenant->id,
            'name' => 'Sample Syringe',
            'sku' => 'SYR-01',
            'selling_price' => 0.00, // Unpriced!
            'is_active' => true,
        ]);

        $batch = Batch::create([
            'tenant_id' => $tenant->id,
            'medicine_id' => $medicine->id,
            'batch_number' => 'SYR-BATCH-1',
            'expiry_date' => now()->addYear()->toDateString(),
            'quantity' => 10,
            'selling_price' => 0.00, // Unpriced!
            'is_active' => true,
        ]);

        // Attempt checkout with client-supplied price on an unpriced item
        $response = $this->postJson('/api/v1/pos/checkout', [
            'paid_amount' => 50.00,
            'payment_method' => 'cash',
            'items' => [
                [
                    'medicine_id' => $medicine->id,
                    'batch_id' => $batch->id,
                    'quantity' => 1,
                    'unit_price' => 50.00,
                ],
            ],
        ], $headers);

        $response->assertStatus(422)
            ->assertJsonValidationErrors('items');
    }

    public function test_pos_checkout_allows_custom_pricing_when_explicitly_configured_by_owner(): void
    {
        ['tenant' => $tenant, 'headers' => $headers] = $this->createTenantWithOwner('Custom Price Pharma');

        // Owner configures policy to allow custom pricing
        $tenant->update(['allow_custom_pricing' => true]);

        $medicine = Medicine::create([
            'tenant_id' => $tenant->id,
            'name' => 'Compounded Ointment',
            'sku' => 'COMP-OINT',
            'selling_price' => 0.00,
            'is_active' => true,
        ]);

        $batch = Batch::create([
            'tenant_id' => $tenant->id,
            'medicine_id' => $medicine->id,
            'batch_number' => 'COMP-01',
            'expiry_date' => now()->addYear()->toDateString(),
            'quantity' => 10,
            'selling_price' => 0.00,
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/v1/pos/checkout', [
            'paid_amount' => 120.00,
            'payment_method' => 'cash',
            'items' => [
                [
                    'medicine_id' => $medicine->id,
                    'batch_id' => $batch->id,
                    'quantity' => 1,
                    'unit_price' => 120.00,
                ],
            ],
        ], $headers);

        $response->assertStatus(201);
        $this->assertEquals('120.00', $response->json('data.total_amount'));
    }

    public function test_cashier_discount_capped_by_pharmacy_policy(): void
    {
        ['tenant' => $tenant] = $this->createTenantWithOwner('Discount Policy Pharma');
        $tenant->update(['max_discount_percentage' => 15.00]); // Max 15% discount limit

        $cashier = User::create([
            'name' => 'Cashier Discount Test',
            'email' => 'cashier.disc@pharmalytics.test',
            'password' => Hash::make('Cashier123!'),
        ]);
        $tenant->users()->attach($cashier, ['is_default' => true]);
        app(PermissionRegistrar::class)->setPermissionsTeamId($tenant->id);
        $cashier->syncRoles(['cashier']);

        $cashierHeaders = [
            'Authorization' => 'Bearer '.$cashier->createToken('cashier-device')->plainTextToken,
            'X-Tenant-ID' => (string) $tenant->id,
        ];

        $medicine = Medicine::create([
            'tenant_id' => $tenant->id,
            'name' => 'Expensive Antibiotic',
            'sku' => 'EXP-ANTI',
            'selling_price' => 100.00,
            'is_active' => true,
        ]);

        $batch = Batch::create([
            'tenant_id' => $tenant->id,
            'medicine_id' => $medicine->id,
            'batch_number' => 'EXP-01',
            'expiry_date' => now()->addYear()->toDateString(),
            'quantity' => 10,
            'selling_price' => 100.00,
            'is_active' => true,
        ]);

        // Cashier attempts 50% discount (allowed limit is 15%)
        $response = $this->postJson('/api/v1/pos/checkout', [
            'paid_amount' => 50.00,
            'payment_method' => 'cash',
            'items' => [
                [
                    'medicine_id' => $medicine->id,
                    'batch_id' => $batch->id,
                    'quantity' => 1,
                    'discount' => 50.00, // 50% discount
                ],
            ],
        ], $cashierHeaders);

        $response->assertStatus(422)
            ->assertJsonValidationErrors('items');
    }

    public function test_server_side_tax_calculation_enforced(): void
    {
        ['tenant' => $tenant, 'headers' => $headers] = $this->createTenantWithOwner('Tax Pharma');
        $tenant->update(['default_tax_rate' => 10.00]); // 10% tax rate

        $medicine = Medicine::create([
            'tenant_id' => $tenant->id,
            'name' => 'Taxable Vitamin',
            'sku' => 'TAX-VIT',
            'selling_price' => 100.00,
            'is_active' => true,
        ]);

        $batch = Batch::create([
            'tenant_id' => $tenant->id,
            'medicine_id' => $medicine->id,
            'batch_number' => 'VIT-01',
            'expiry_date' => now()->addYear()->toDateString(),
            'quantity' => 10,
            'selling_price' => 100.00,
            'is_active' => true,
        ]);

        // Client attempts to pass tax_amount: 0 in request
        $response = $this->postJson('/api/v1/pos/checkout', [
            'tax_amount' => 0.00, // Client tries to evade tax
            'paid_amount' => 110.00,
            'payment_method' => 'cash',
            'items' => [
                [
                    'medicine_id' => $medicine->id,
                    'batch_id' => $batch->id,
                    'quantity' => 1,
                ],
            ],
        ], $headers);

        $response->assertStatus(201);
        $sale = $response->json('data');

        // Backend must calculate 10% tax (10.00), making total 110.00!
        $this->assertEquals('10.00', $sale['tax_amount']);
        $this->assertEquals('110.00', $sale['total_amount']);
    }

    public function test_tenant_settings_can_only_be_updated_by_manager(): void
    {
        ['tenant' => $tenant, 'headers' => $ownerHeaders] = $this->createTenantWithOwner('Settings Pharma');

        // Owner can read and update settings
        $getRes = $this->getJson('/api/v1/tenant/settings', $ownerHeaders);
        $getRes->assertStatus(200);

        $putRes = $this->putJson('/api/v1/tenant/settings', [
            'allow_custom_pricing' => true,
            'max_discount_percentage' => 25.00,
            'default_tax_rate' => 15.00,
        ], $ownerHeaders);

        $putRes->assertStatus(200);
        $this->assertTrue($putRes->json('data.allow_custom_pricing'));
        $this->assertEquals('25.00', $putRes->json('data.max_discount_percentage'));
        $this->assertEquals('15.00', $putRes->json('data.default_tax_rate'));
    }

    public function test_stock_adjustment_requires_mandatory_batch_selection(): void
    {
        ['tenant' => $tenant, 'headers' => $headers] = $this->createTenantWithOwner('Batch Adjustment Pharma');

        $medicine = Medicine::create([
            'tenant_id' => $tenant->id,
            'name' => 'Amoxicillin 250mg',
            'sku' => 'AMOX-250',
            'is_active' => true,
        ]);

        // Attempt stock adjustment WITHOUT batch_id
        $response = $this->postJson('/api/v1/stock-adjustments', [
            'reason' => 'Vague count without batch',
            'items' => [
                [
                    'medicine_id' => $medicine->id,
                    'counted_quantity' => 50,
                ],
            ],
        ], $headers);

        $response->assertStatus(422)
            ->assertJsonValidationErrors('items.0.batch_id');
    }

    public function test_anti_discount_stacking_prevents_cashier_exceeding_policy(): void
    {
        ['tenant' => $tenant] = $this->createTenantWithOwner('Anti Stacking Pharma');
        $tenant->update(['max_discount_percentage' => 20.00]); // 20% max allowed

        $cashier = User::create([
            'name' => 'Cashier Stacker',
            'email' => 'cashier.stack@pharmalytics.test',
            'password' => Hash::make('Cashier123!'),
        ]);
        $tenant->users()->attach($cashier, ['is_default' => true]);
        app(PermissionRegistrar::class)->setPermissionsTeamId($tenant->id);
        $cashier->syncRoles(['cashier']);

        $cashierHeaders = [
            'Authorization' => 'Bearer '.$cashier->createToken('cashier-device')->plainTextToken,
            'X-Tenant-ID' => (string) $tenant->id,
        ];

        $medicine = Medicine::create([
            'tenant_id' => $tenant->id,
            'name' => 'Pricey Medicine',
            'sku' => 'PRICEY-01',
            'selling_price' => 100.00,
            'is_active' => true,
        ]);

        $batch = Batch::create([
            'tenant_id' => $tenant->id,
            'medicine_id' => $medicine->id,
            'batch_number' => 'PRICEY-B1',
            'expiry_date' => now()->addYear()->toDateString(),
            'quantity' => 10,
            'selling_price' => 100.00,
            'is_active' => true,
        ]);

        // Cashier gives 15% line discount (15.00) AND 15.00 order discount
        // Gross: 100.00. Total discount: 30.00 (30% effective discount > 20% cap)
        $response = $this->postJson('/api/v1/pos/checkout', [
            'paid_amount' => 70.00,
            'payment_method' => 'cash',
            'discount_amount' => 15.00,
            'items' => [
                [
                    'medicine_id' => $medicine->id,
                    'batch_id' => $batch->id,
                    'quantity' => 1,
                    'discount' => 15.00,
                ],
            ],
        ], $cashierHeaders);

        $response->assertStatus(422)
            ->assertJsonValidationErrors('discount_amount');
    }

    public function test_only_owner_can_create_and_delete_admin_accounts(): void
    {
        ['tenant' => $tenant, 'headers' => $ownerHeaders] = $this->createTenantWithOwner('Hierarchy Pharma');

        // 1. Owner creates Admin A
        $createAdminRes = $this->postJson('/api/v1/staff', [
            'name' => 'Admin Alice',
            'email' => 'admin.alice@pharmalytics.test',
            'password' => 'AdminPass123!',
            'role' => 'admin',
        ], $ownerHeaders);

        $createAdminRes->assertStatus(201);
        $adminAId = $createAdminRes->json('data.id');

        $adminUser = User::find($adminAId);
        $adminHeaders = [
            'Authorization' => 'Bearer '.$adminUser->createToken('admin-device')->plainTextToken,
            'X-Tenant-ID' => (string) $tenant->id,
        ];

        // Reset cached auth guard user so request authenticates with adminHeaders
        $this->app['auth']->forgetGuards();

        // 2. Admin Alice tries to create another Admin Bob -> FORBIDDEN (403)
        $createAnotherAdminRes = $this->postJson('/api/v1/staff', [
            'name' => 'Admin Bob',
            'email' => 'admin.bob@pharmalytics.test',
            'password' => 'AdminBob123!',
            'role' => 'admin',
        ], $adminHeaders);

        $createAnotherAdminRes->assertStatus(403);

        // 3. Admin Alice CAN create a Pharmacist
        $createPharmRes = $this->postJson('/api/v1/staff', [
            'name' => 'Pharmacist Charlie',
            'email' => 'pharm.charlie@pharmalytics.test',
            'password' => 'PharmPass123!',
            'role' => 'pharmacist',
        ], $adminHeaders);

        $createPharmRes->assertStatus(201);
        $pharmId = $createPharmRes->json('data.id');

        // 4. Admin Alice tries to delete Admin Alice -> 422 (cannot delete self)
        $this->deleteJson("/api/v1/staff/{$adminAId}", [], $adminHeaders)->assertStatus(422);

        // 5. Owner creates Admin Dave
        $this->app['auth']->forgetGuards();
        $createDaveRes = $this->postJson('/api/v1/staff', [
            'name' => 'Admin Dave',
            'email' => 'admin.dave@pharmalytics.test',
            'password' => 'AdminDave123!',
            'role' => 'admin',
        ], $ownerHeaders);
        $daveId = $createDaveRes->json('data.id');

        // 6. Admin Alice tries to delete Admin Dave -> FORBIDDEN (403)
        $this->app['auth']->forgetGuards();
        $this->deleteJson("/api/v1/staff/{$daveId}", [], $adminHeaders)->assertStatus(403);

        // 7. Owner deletes Admin Dave -> SUCCEEDS (200)
        $this->app['auth']->forgetGuards();
        $this->deleteJson("/api/v1/staff/{$daveId}", [], $ownerHeaders)->assertStatus(200);
    }
}
