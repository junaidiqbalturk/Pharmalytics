<?php

namespace App\Modules\Inventory\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreStockAdjustmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tenantId = $this->attributes->get('tenant')?->getKey()
            ?: $this->integer('tenant_id')
            ?: (int) $this->header('X-Tenant-ID');

        return [
            'reason' => ['required', 'string', 'max:180'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.medicine_id' => [
                'required',
                'integer',
                Rule::exists('medicines', 'id')->where('tenant_id', $tenantId),
            ],
            'items.*.batch_id' => [
                'required',
                'integer',
                Rule::exists('batches', 'id')->where('tenant_id', $tenantId),
            ],
            'items.*.system_quantity' => ['sometimes', 'nullable', 'numeric'],
            'items.*.counted_quantity' => ['required', 'numeric', 'min:0'],
            'items.*.unit_cost' => ['nullable', 'numeric', 'min:0'],
        ];
    }
}
