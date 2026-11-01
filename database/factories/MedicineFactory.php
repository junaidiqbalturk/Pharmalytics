<?php

namespace Database\Factories;

use App\Modules\Catalog\Models\Medicine;
use App\Modules\Foundation\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Medicine>
 */
class MedicineFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->unique()->words(2, true);

        return [
            'tenant_id' => Tenant::factory(),
            'medicine_category_id' => null,
            'name' => Str::title($name),
            'generic_name' => null,
            'sku' => strtoupper(fake()->unique()->bothify('MED-####??')),
            'barcode' => null,
            'strength' => null,
            'dosage_form' => null,
            'reorder_level' => 0,
            'is_active' => true,
        ];
    }
}
