<?php

use App\Modules\Foundation\Models\Tenant;
use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    public function up(): void
    {
        $permissions = [
            'catalog.view', 'catalog.manage',
            'master_data.view', 'master_data.manage',
            'inventory.view', 'inventory.manage',
            'procurement.view', 'procurement.manage',
            'sales.view', 'sales.manage',
            'accounting.view', 'accounting.manage',
        ];

        foreach ($permissions as $permissionName) {
            Permission::findOrCreate($permissionName, 'web');
        }

        $allPermissions = Permission::whereIn('name', $permissions)->get();

        Tenant::query()->each(function (Tenant $tenant) use ($allPermissions): void {
            app(PermissionRegistrar::class)->setPermissionsTeamId($tenant->id);
            $ownerRole = Role::findOrCreate('owner', 'web');
            $ownerRole->syncPermissions($allPermissions);

            // Also ensure any tenant users who have owner role get permissions cleared cache
            foreach ($tenant->users as $user) {
                if ($user->hasRole('owner')) {
                    $user->syncPermissions($allPermissions);
                }
            }
        });

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
    }
};
