<?php

namespace App\Modules\Catalog\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMedicineRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tenantId = $this->attributes->get('tenant')?->getKey();

        return [
            'medicine_category_id' => [
                'nullable',
                'integer',
                Rule::exists('medicine_categories', 'id')->where('tenant_id', $tenantId),
            ],
            'name' => ['required', 'string', 'max:180'],
            'generic_name' => ['nullable', 'string', 'max:180'],
            'sku' => ['required', 'string', 'max:64', Rule::unique('medicines', 'sku')->where('tenant_id', $tenantId)],
            'barcode' => ['nullable', 'string', 'max:64', Rule::unique('medicines', 'barcode')->where('tenant_id', $tenantId)],
            'strength' => ['nullable', 'string', 'max:80'],
            'dosage_form' => ['nullable', 'string', 'max:80'],
            'reorder_level' => ['sometimes', 'numeric', 'min:0', 'decimal:0,3'],
            'cost_price' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'selling_price' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'tablets_per_strip' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'strips_per_box' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'price_per_strip' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'price_per_unit' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'price_per_box' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'initial_stock' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'batch_number' => ['sometimes', 'nullable', 'string', 'max:80'],
            'expiry_date' => ['sometimes', 'nullable', 'date'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
