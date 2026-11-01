<?php

namespace App\Modules\Foundation\Models;

use App\Modules\Catalog\Models\Medicine;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MedicineCategory extends Model
{
    use HasFactory;

    public const DEFAULT_CATEGORIES = [
        'Analgesics',
        'Antibiotics',
        'Antidiabetics',
        'Cardiovascular',
        'Dermatology',
        'Gastrointestinal',
        'Vitamins and supplements',
    ];

    protected $fillable = ['tenant_id', 'name', 'slug', 'description', 'is_active'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    /**
     * @return BelongsTo<Tenant, $this>
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * @return HasMany<Medicine, $this>
     */
    public function medicines(): HasMany
    {
        return $this->hasMany(Medicine::class);
    }
}
