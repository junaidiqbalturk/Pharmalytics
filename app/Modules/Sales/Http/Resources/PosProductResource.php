<?php

namespace App\Modules\Sales\Http\Resources;

use App\Modules\Catalog\Models\Medicine;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Medicine
 */
class PosProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        // First active non-expired batch with available quantity
        $activeBatch = $this->batches
            ->where('is_active', true)
            ->where('quantity', '>', 0)
            ->where('expiry_date', '>=', now()->toDateString())
            ->sortBy('expiry_date')
            ->first();

        $totalStock = $this->batches
            ->where('is_active', true)
            ->where('expiry_date', '>=', now()->toDateString())
            ->sum('quantity');

        $price = (float) ($activeBatch ? $activeBatch->selling_price : ($this->selling_price ?? 0));
        $tabletsPerStrip = $this->tablets_per_strip ?: 10;
        $stripsPerBox = $this->strips_per_box ?: 10;
        $pricePerStrip = (float) ($this->price_per_strip ?: $price);
        $pricePerUnit = (float) ($this->price_per_unit ?: round($pricePerStrip / max(1, $tabletsPerStrip), 2));
        $pricePerBox = (float) ($this->price_per_box ?: round($pricePerStrip * max(1, $stripsPerBox), 2));

        return [
            'id' => $this->id,
            'name' => $this->name,
            'generic_name' => $this->generic_name,
            'sku' => $this->sku,
            'barcode' => $this->barcode,
            'strength' => $this->strength,
            'dosage_form' => $this->dosage_form,
            'packaging_type' => $this->packaging_type ?? 'blister',
            'is_divisible' => (bool) ($this->is_divisible ?? true),
            'package_label' => $this->package_label ?: ucfirst($this->packaging_type ?? 'pack'),
            'selling_price' => (string) $price,
            'tablets_per_strip' => $tabletsPerStrip,
            'strips_per_box' => $stripsPerBox,
            'price_per_strip' => (string) $pricePerStrip,
            'price_per_unit' => (string) $pricePerUnit,
            'price_per_box' => (string) $pricePerBox,
            'default_batch_id' => $activeBatch?->id,
            'default_batch_number' => $activeBatch?->batch_number,
            'default_expiry_date' => $activeBatch?->expiry_date?->format('Y-m-d'),
            'total_stock' => (string) $totalStock,
            'in_stock' => $totalStock > 0,
        ];
    }
}
