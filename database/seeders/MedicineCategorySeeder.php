<?php

namespace Database\Seeders;

use App\Modules\Foundation\Models\MedicineCategory;
use App\Modules\Foundation\Models\Tenant;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class MedicineCategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Tenant::query()->each(function (Tenant $tenant): void {
            foreach (MedicineCategory::DEFAULT_CATEGORIES as $categoryName) {
                $tenant->medicineCategories()->firstOrCreate(
                    ['slug' => Str::slug($categoryName)],
                    ['name' => $categoryName],
                );
            }
        });
    }
}
