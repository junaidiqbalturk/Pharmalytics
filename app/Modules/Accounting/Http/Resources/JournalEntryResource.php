<?php

namespace App\Modules\Accounting\Http\Resources;

use App\Modules\Accounting\Models\JournalEntry;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin JournalEntry
 */
class JournalEntryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'entry_number' => $this->entry_number,
            'date' => $this->date?->format('Y-m-d'),
            'description' => $this->description,
            'reference_type' => $this->reference_type,
            'reference_id' => $this->reference_id,
            'status' => $this->status,
            'creator_name' => $this->creator?->name,
            'items' => $this->items->map(fn ($item) => [
                'id' => $item->id,
                'chart_of_account_id' => $item->chart_of_account_id,
                'account_code' => $item->account?->code,
                'account_name' => $item->account?->name,
                'type' => $item->type,
                'amount' => (string) $item->amount,
                'description' => $item->description,
            ]),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
