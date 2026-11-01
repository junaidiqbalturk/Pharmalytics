<?php

namespace App\Modules\Inventory\Http\Resources;

use App\Modules\Inventory\Models\StockAdjustment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin StockAdjustment
 */
class StockAdjustmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'reference_number' => $this->reference_number,
            'reason' => $this->reason,
            'status' => $this->status,
            'creator_name' => $this->creator?->name,
            'adjusted_at' => $this->adjusted_at?->toISOString(),
            'items' => $this->items->map(fn ($item) => [
                'id' => $item->id,
                'medicine_id' => $item->medicine_id,
                'medicine_name' => $item->medicine?->name,
                'batch_id' => $item->batch_id,
                'batch_number' => $item->batch?->batch_number,
                'system_quantity' => (string) $item->system_quantity,
                'counted_quantity' => (string) $item->counted_quantity,
                'difference' => (string) $item->difference,
                'unit_cost' => (string) $item->unit_cost,
            ]),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
