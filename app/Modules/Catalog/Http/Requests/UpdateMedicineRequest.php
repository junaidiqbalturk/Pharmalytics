<?php

namespace App\Modules\Catalog\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateMedicineRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tenantId = $this->attributes->get('tenant')?->getKey();
        $param = $this->route('medicine');
        $medicineId = is_object($param) ? $param->getKey() : (int) $param;

        return [
            'medicine_category_id' => [
                'sometimes',
                'nullable',
                'integer',
                Rule::exists('medicine_categories', 'id')->where('tenant_id', $tenantId),
            ],
            'name' => ['sometimes', 'required', 'string', 'max:180'],
            'generic_name' => ['sometimes', 'nullable', 'string', 'max:180'],
            'sku' => ['sometimes', 'required', 'string', 'max:64', Rule::unique('medicines', 'sku')->where('tenant_id', $tenantId)->ignore($medicineId)],
            'barcode' => ['sometimes', 'nullable', 'string', 'max:64', Rule::unique('medicines', 'barcode')->where('tenant_id', $tenantId)->ignore($medicineId)],
            'strength' => ['sometimes', 'nullable', 'string', 'max:80'],
            'dosage_form' => ['sometimes', 'nullable', 'string', 'max:80'],
            'packaging_type' => ['sometimes', 'nullable', 'string', 'max:50'],
            'is_divisible' => ['sometimes', 'boolean'],
            'package_label' => ['sometimes', 'nullable', 'string', 'max:50'],
            'reorder_level' => ['sometimes', 'numeric', 'min:0', 'decimal:0,3'],
            'cost_price' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'selling_price' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'tablets_per_strip' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'strips_per_box' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'price_per_strip' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'price_per_unit' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'price_per_box' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
