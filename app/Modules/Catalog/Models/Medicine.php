<?php

namespace App\Modules\Catalog\Models;

use App\Modules\Foundation\Models\MedicineCategory;
use App\Modules\Foundation\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Medicine extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'medicine_category_id',
        'name',
        'generic_name',
        'sku',
        'barcode',
        'strength',
        'dosage_form',
        'reorder_level',
        'cost_price',
        'selling_price',
        'tablets_per_strip',
        'strips_per_box',
        'price_per_strip',
        'price_per_unit',
        'price_per_box',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'reorder_level' => 'decimal:3',
            'cost_price' => 'decimal:2',
            'selling_price' => 'decimal:2',
            'tablets_per_strip' => 'integer',
            'strips_per_box' => 'integer',
            'price_per_strip' => 'decimal:2',
            'price_per_unit' => 'decimal:2',
            'price_per_box' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<Tenant, $this>
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * @return BelongsTo<MedicineCategory, $this>
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(MedicineCategory::class, 'medicine_category_id');
    }

    /**
     * @return \Illuminate\Database\Eloquent\Relations\HasMany<\App\Modules\Inventory\Models\Batch, $this>
     */
    public function batches(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(\App\Modules\Inventory\Models\Batch::class);
    }
}
