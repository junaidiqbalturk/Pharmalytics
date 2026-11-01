<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Foundation\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register_new_tenant_workspace_and_become_owner(): void
    {
        $payload = [
            'name' => 'Dr. Alexander Fleming',
            'email' => 'alexander@flemingpharma.com',
            'password' => 'Penicillin#2026Secure',
            'password_confirmation' => 'Penicillin#2026Secure',
            'device_name' => 'test-device',
            'tenant' => [
                'name' => 'Fleming Central Pharmacy',
                'currency_code' => 'USD',
                'timezone' => 'America/New_York',
            ],
        ];

        $response = $this->postJson('/api/v1/auth/register', $payload);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'data' => [
                    'access_token',
                    'token_type',
                    'user' => ['id', 'name', 'email'],
                    'tenant' => ['id', 'name', 'slug', 'currency_code', 'timezone'],
                ],
            ]);

        $this->assertDatabaseHas('users', [
            'email' => 'alexander@flemingpharma.com',
            'name' => 'Dr. Alexander Fleming',
        ]);

        $this->assertDatabaseHas('tenants', [
            'name' => 'Fleming Central Pharmacy',
            'currency_code' => 'USD',
        ]);

        $tenant = Tenant::where('name', 'Fleming Central Pharmacy')->firstOrFail();
        $user = User::where('email', 'alexander@flemingpharma.com')->firstOrFail();

        $this->assertTrue($tenant->users()->whereKey($user->id)->exists());

        // Verify default medicine categories are seeded for the tenant
        $this->assertGreaterThan(0, $tenant->medicineCategories()->count());

        // Verify Spatie team owner role assignment
        app(PermissionRegistrar::class)->setPermissionsTeamId($tenant->id);
        $this->assertTrue($user->hasRole('owner'));
    }

    public function test_registration_fails_with_invalid_data(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => '',
            'email' => 'not-an-email',
            'password' => 'short',
            'password_confirmation' => 'different',
            'tenant' => [
                'name' => '',
            ],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'email', 'password', 'tenant.name']);
    }

    public function test_user_can_login_with_valid_credentials(): void
    {
        $tenant = Tenant::create([
            'name' => 'Apex Pharmacy',
            'slug' => 'apex-pharmacy',
            'currency_code' => 'USD',
            'timezone' => 'UTC',
        ]);

        $user = User::create([
            'name' => 'Jane Doe',
            'email' => 'jane@apexpharma.com',
            'password' => Hash::make('SecretPass123!'),
        ]);

        $tenant->users()->attach($user, ['is_default' => true]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'jane@apexpharma.com',
            'password' => 'SecretPass123!',
            'device_name' => 'pos-terminal-1',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'access_token',
                    'token_type',
                    'user' => ['id', 'name', 'email'],
                    'tenants',
                    'default_tenant_id',
                ],
            ]);

        $this->assertEquals($tenant->id, $response->json('data.default_tenant_id'));
    }

    public function test_login_fails_with_invalid_credentials(): void
    {
        $user = User::create([
            'name' => 'Jane Doe',
            'email' => 'jane@apexpharma.com',
            'password' => Hash::make('CorrectPassword123!'),
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'jane@apexpharma.com',
            'password' => 'WrongPassword',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_authenticated_user_can_retrieve_profile_and_tenants(): void
    {
        $tenant = Tenant::create([
            'name' => 'BioHealth Pharmacy',
            'slug' => 'biohealth-pharma',
            'currency_code' => 'USD',
            'timezone' => 'UTC',
        ]);

        $user = User::create([
            'name' => 'John Pharmacist',
            'email' => 'john@biohealth.com',
            'password' => Hash::make('SecurePassword123!'),
        ]);

        $tenant->users()->attach($user, ['is_default' => true]);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/auth/me');

        $response->assertStatus(200)
            ->assertJson([
                'data' => [
                    'user' => [
                        'id' => $user->id,
                        'name' => 'John Pharmacist',
                        'email' => 'john@biohealth.com',
                    ],
                    'tenants' => [
                        [
                            'id' => $tenant->id,
                            'name' => 'BioHealth Pharmacy',
                            'slug' => 'biohealth-pharma',
                        ],
                    ],
                ],
            ]);
    }

    public function test_user_can_logout_and_revoke_token(): void
    {
        $user = User::create([
            'name' => 'John Pharmacist',
            'email' => 'john@biohealth.com',
            'password' => Hash::make('SecurePassword123!'),
        ]);

        $token = $user->createToken('test-token');

        $response = $this->withHeader('Authorization', 'Bearer '.$token->plainTextToken)
            ->postJson('/api/v1/auth/logout');

        $response->assertStatus(200)
            ->assertJson(['message' => 'Signed out.']);

        $this->assertDatabaseMissing('personal_access_tokens', [
            'id' => $token->accessToken->id,
        ]);
    }
}
