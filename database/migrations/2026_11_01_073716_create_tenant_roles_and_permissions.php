<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $allPermissions = [
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
            'staff.view',
            'staff.manage',
        ];

        foreach ($allPermissions as $perm) {
            Permission::findOrCreate($perm, 'web');
        }

        // 1. Owner & Admin
        $owner = Role::findOrCreate('owner', 'web');
        $owner->syncPermissions($allPermissions);

        $admin = Role::findOrCreate('admin', 'web');
        $admin->syncPermissions($allPermissions);

        // 2. Pharmacist
        $pharmacist = Role::findOrCreate('pharmacist', 'web');
        $pharmacist->syncPermissions([
            'catalog.view',
            'catalog.manage',
            'inventory.view',
            'inventory.manage',
            'procurement.view',
            'sales.view',
            'sales.manage',
        ]);

        // 3. Cashier (Strictly OTC Dispensing & Read-only Catalog/Stock)
        $cashier = Role::findOrCreate('cashier', 'web');
        $cashier->syncPermissions([
            'catalog.view',
            'inventory.view',
            'sales.view',
            'sales.manage',
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No-op to preserve audit trail
    }
};
