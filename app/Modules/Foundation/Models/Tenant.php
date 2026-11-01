<?php

namespace App\Modules\Foundation\Models;

use App\Models\User;
use App\Modules\Catalog\Models\Medicine;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Tenant extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'slug', 'currency_code', 'country_code', 'country', 'timezone'];

    /**
     * @return BelongsToMany<User, $this>
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class)
            ->withPivot('is_default')
            ->withTimestamps();
    }

    /**
     * @return HasMany<MedicineCategory, $this>
     */
    public function medicineCategories(): HasMany
    {
        return $this->hasMany(MedicineCategory::class);
    }

    /**
     * @return HasMany<Medicine, $this>
     */
    public function medicines(): HasMany
    {
        return $this->hasMany(Medicine::class);
    }
}
