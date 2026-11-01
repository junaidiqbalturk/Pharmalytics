<?php

namespace App\Modules\Foundation\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Accounting\Models\ChartOfAccount;
use App\Modules\Foundation\Http\Requests\LoginRequest;
use App\Modules\Foundation\Http\Requests\RegisterRequest;
use App\Modules\Foundation\Http\Resources\TenantResource;
use App\Modules\Foundation\Models\MedicineCategory;
use App\Modules\Foundation\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class AuthController extends Controller
{
    public function register(RegisterRequest $request, PermissionRegistrar $permissionRegistrar): JsonResponse
    {
        $data = $request->validated();

        [$user, $tenant] = DB::transaction(function () use ($data, $permissionRegistrar): array {
            $tenantData = $data['tenant'];
            $currency = Str::upper($tenantData['currency_code'] ?? 'USD');
            $countryCode = Str::upper($tenantData['country_code'] ?? ($currency === 'PKR' ? 'PK' : 'US'));
            $country = $tenantData['country'] ?? ($countryCode === 'PK' ? 'Pakistan' : 'International');

            $tenant = Tenant::query()->create([
                'name' => $tenantData['name'],
                'slug' => $tenantData['slug'] ?? Str::slug($tenantData['name']).'-'.Str::lower(Str::random(6)),
                'currency_code' => $currency,
                'country_code' => $countryCode,
                'country' => $country,
                'timezone' => $tenantData['timezone'] ?? 'UTC',
            ]);

            foreach (MedicineCategory::DEFAULT_CATEGORIES as $categoryName) {
                $tenant->medicineCategories()->create([
                    'name' => $categoryName,
                    'slug' => Str::slug($categoryName),
                ]);
            }

            $defaultAccounts = [
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

            foreach ($defaultAccounts as $acc) {
                ChartOfAccount::create([
                    'tenant_id' => $tenant->id,
                    'code' => $acc['code'],
                    'name' => $acc['name'],
                    'type' => $acc['type'],
                    'is_system' => true,
                    'is_active' => true,
                ]);
            }

            $user = User::query()->create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => $data['password'],
            ]);

            $tenant->users()->attach($user, ['is_default' => true]);
            $permissionRegistrar->setPermissionsTeamId($tenant->getKey());

            $ownerRole = Role::findOrCreate('owner', 'web');
            $permissions = collect([
                'catalog.view',
                'catalog.manage',
                'master_data.view',
                'master_data.manage',
                'inventory.view',
                'inventory.manage',
                'procurement.view',
                'procurement.manage',
                'sales.view',
                'sales.manage',
                'accounting.view',
                'accounting.manage',
            ])->map(fn (string $permission): Permission => Permission::findOrCreate($permission, 'web'));
            $ownerRole->syncPermissions($permissions);
            $user->assignRole($ownerRole);

            return [$user, $tenant];
        });

        $token = $user->createToken($request->string('device_name', 'web')->toString())->plainTextToken;

        return response()->json([
            'data' => [
                'access_token' => $token,
                'token_type' => 'Bearer',
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'roles' => ['owner'],
                    'permissions' => $user->getAllPermissions()->pluck('name')->values()->all(),
                ],
                'tenant' => (new TenantResource($tenant))->resolve(),
            ],
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $data = $request->validated();
        $user = User::query()->where('email', $data['email'])->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages(['email' => ['The provided credentials are incorrect.']]);
        }

        $tenant = $user->tenants()->orderByPivot('is_default', 'desc')->orderBy('tenants.name')->first();
        $targetTenantId = (int) ($request->header('X-Tenant-ID') ?: $tenant?->getKey());

        $roles = [];
        $permissions = [];
        if ($targetTenantId > 0) {
            app(\Spatie\Permission\PermissionRegistrar::class)->setPermissionsTeamId($targetTenantId);
            $roles = $user->getRoleNames()->values()->all();
            $permissions = $user->getAllPermissions()->pluck('name')->values()->all();
        }

        return response()->json([
            'data' => [
                'access_token' => $user->createToken($data['device_name'] ?? 'web')->plainTextToken,
                'token_type' => 'Bearer',
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'roles' => $roles,
                    'permissions' => $permissions,
                ],
                'tenants' => TenantResource::collection($user->tenants()->orderBy('name')->get())->resolve(),
                'default_tenant_id' => $tenant?->getKey(),
            ],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['message' => 'Signed out.']);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        $targetTenantId = (int) ($request->header('X-Tenant-ID') ?: $user->tenants()->orderByPivot('is_default', 'desc')->first()?->getKey());

        $roles = [];
        $permissions = [];
        if ($targetTenantId > 0) {
            app(\Spatie\Permission\PermissionRegistrar::class)->setPermissionsTeamId($targetTenantId);
            $roles = $user->getRoleNames()->values()->all();
            $permissions = $user->getAllPermissions()->pluck('name')->values()->all();
        }

        return response()->json([
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'roles' => $roles,
                    'permissions' => $permissions,
                ],
                'tenants' => TenantResource::collection($user->tenants()->orderBy('name')->get())->resolve(),
            ],
        ]);
    }
}
