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
            'staff.view',
            'staff.manage',
        ];

        foreach ($permissions as $permissionName) {
            Permission::findOrCreate($permissionName, 'web');
        }

        $staffPermissions = Permission::whereIn('name', $permissions)->get();

        // 1. Assign to global roles
        $ownerRole = Role::findOrCreate('owner', 'web');
        $ownerRole->givePermissionTo($staffPermissions);

        $adminRole = Role::findOrCreate('admin', 'web');
        $adminRole->givePermissionTo($staffPermissions);

        // 2. Assign to tenant-scoped roles
        Tenant::query()->each(function (Tenant $tenant) use ($staffPermissions): void {
            app(PermissionRegistrar::class)->setPermissionsTeamId($tenant->id);
            $tenantOwner = Role::findOrCreate('owner', 'web');
            $tenantOwner->givePermissionTo($staffPermissions);

            $tenantAdmin = Role::findOrCreate('admin', 'web');
            $tenantAdmin->givePermissionTo($staffPermissions);
        });

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        // Preserved for audit safety
    }
};
