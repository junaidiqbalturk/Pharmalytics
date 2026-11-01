<?php

namespace App\Modules\Catalog\Http\Resources;

use App\Modules\Foundation\Http\Resources\MedicineCategoryResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MedicineResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'category' => new MedicineCategoryResource($this->whenLoaded('category')),
            'name' => $this->name,
            'generic_name' => $this->generic_name,
            'sku' => $this->sku,
            'barcode' => $this->barcode,
            'strength' => $this->strength,
            'dosage_form' => $this->dosage_form,
            'reorder_level' => $this->reorder_level,
            'cost_price' => (string) ($this->cost_price ?? '0.00'),
            'selling_price' => (string) ($this->selling_price ?? '0.00'),
            'tablets_per_strip' => $this->tablets_per_strip ?? 10,
            'strips_per_box' => $this->strips_per_box ?? 10,
            'price_per_strip' => (string) ($this->price_per_strip ?? $this->selling_price ?? '0.00'),
            'price_per_unit' => (string) ($this->price_per_unit ?? '0.00'),
            'price_per_box' => (string) ($this->price_per_box ?? '0.00'),
            'is_active' => $this->is_active,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
