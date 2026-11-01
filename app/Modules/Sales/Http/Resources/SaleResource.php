<?php

namespace App\Modules\Sales\Http\Resources;

use App\Modules\Sales\Models\Sale;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Sale
 */
class SaleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'invoice_number' => $this->invoice_number,
            'customer_id' => $this->customer_id,
            'customer_name' => $this->customer?->name,
            'subtotal' => (string) $this->subtotal,
            'discount_amount' => (string) $this->discount_amount,
            'tax_amount' => (string) $this->tax_amount,
            'total_amount' => (string) $this->total_amount,
            'paid_amount' => (string) $this->paid_amount,
            'change_amount' => (string) $this->change_amount,
            'payment_method' => $this->payment_method,
            'status' => $this->status,
            'server_name' => $this->server?->name,
            'items' => $this->items->map(fn ($item) => [
                'id' => $item->id,
                'medicine_id' => $item->medicine_id,
                'medicine_name' => $item->medicine?->name,
                'batch_id' => $item->batch_id,
                'batch_number' => $item->batch?->batch_number,
                'quantity' => (string) $item->quantity,
                'unit_type' => $item->unit_type ?? 'strip',
                'unit_price' => (string) $item->unit_price,
                'discount' => (string) $item->discount,
                'subtotal' => (string) $item->subtotal,
            ]),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
