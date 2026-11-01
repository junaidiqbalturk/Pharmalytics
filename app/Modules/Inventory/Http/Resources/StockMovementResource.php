<?php

namespace App\Modules\Inventory\Http\Resources;

use App\Modules\Inventory\Models\StockMovement;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin StockMovement
 */
class StockMovementResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'medicine_id' => $this->medicine_id,
            'medicine_name' => $this->medicine?->name,
            'batch_id' => $this->batch_id,
            'batch_number' => $this->batch?->batch_number,
            'type' => $this->type,
            'quantity' => (string) $this->quantity,
            'balance_after' => (string) $this->balance_after,
            'reference_type' => $this->reference_type,
            'reference_id' => $this->reference_id,
            'notes' => $this->notes,
            'creator_name' => $this->creator?->name,
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
