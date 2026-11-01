<?php

namespace App\Modules\Inventory\Http\Resources;

use App\Modules\Inventory\Models\Batch;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Batch
 */
class BatchResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'medicine_id' => $this->medicine_id,
            'medicine_name' => $this->medicine?->name,
            'batch_number' => $this->batch_number,
            'expiry_date' => $this->expiry_date?->format('Y-m-d'),
            'mfg_date' => $this->mfg_date?->format('Y-m-d'),
            'cost_price' => (string) $this->cost_price,
            'selling_price' => (string) $this->selling_price,
            'quantity' => (string) $this->quantity,
            'is_active' => $this->is_active,
            'is_expired' => $this->expiry_date && $this->expiry_date->isPast(),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
