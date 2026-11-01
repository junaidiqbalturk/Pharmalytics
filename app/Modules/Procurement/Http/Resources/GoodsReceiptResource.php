<?php

namespace App\Modules\Procurement\Http\Resources;

use App\Modules\Procurement\Models\GoodsReceipt;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin GoodsReceipt
 */
class GoodsReceiptResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'grn_number' => $this->grn_number,
            'purchase_order_id' => $this->purchase_order_id,
            'supplier_id' => $this->supplier_id,
            'supplier_name' => $this->supplier?->name,
            'invoice_number' => $this->invoice_number,
            'received_date' => $this->received_date?->format('Y-m-d'),
            'total_amount' => (string) $this->total_amount,
            'payment_status' => $this->payment_status,
            'notes' => $this->notes,
            'creator_name' => $this->creator?->name,
            'items' => $this->items->map(fn ($item) => [
                'id' => $item->id,
                'medicine_id' => $item->medicine_id,
                'medicine_name' => $item->medicine?->name,
                'batch_number' => $item->batch_number,
                'expiry_date' => $item->expiry_date?->format('Y-m-d'),
                'quantity_received' => (string) $item->quantity_received,
                'unit_cost' => (string) $item->unit_cost,
                'selling_price' => (string) $item->selling_price,
                'subtotal' => (string) $item->subtotal,
            ]),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
