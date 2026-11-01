<?php

namespace App\Modules\Procurement\Http\Resources;

use App\Modules\Procurement\Models\PurchaseOrder;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin PurchaseOrder
 */
class PurchaseOrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'po_number' => $this->po_number,
            'supplier_id' => $this->supplier_id,
            'supplier_name' => $this->supplier?->name,
            'order_date' => $this->order_date?->format('Y-m-d'),
            'expected_date' => $this->expected_date?->format('Y-m-d'),
            'status' => $this->status,
            'total_amount' => (string) $this->total_amount,
            'notes' => $this->notes,
            'creator_name' => $this->creator?->name,
            'items' => $this->items->map(fn ($item) => [
                'id' => $item->id,
                'medicine_id' => $item->medicine_id,
                'medicine_name' => $item->medicine?->name,
                'quantity_ordered' => (string) $item->quantity_ordered,
                'quantity_received' => (string) $item->quantity_received,
                'unit_price' => (string) $item->unit_price,
                'subtotal' => (string) $item->subtotal,
            ]),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
