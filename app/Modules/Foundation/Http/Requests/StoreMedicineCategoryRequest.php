<?php

namespace App\Modules\Foundation\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class StoreMedicineCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if (! $this->filled('slug') && $this->filled('name')) {
            $this->merge([
                'slug' => Str::slug($this->string('name')->toString()),
            ]);
        }
    }

    public function rules(): array
    {
        $tenantId = $this->attributes->get('tenant')?->getKey();

        return [
            'name' => ['required', 'string', 'max:120'],
            'slug' => [
                'sometimes',
                'string',
                'max:140',
                'alpha_dash',
                Rule::unique('medicine_categories', 'slug')->where('tenant_id', $tenantId),
            ],
            'description' => ['nullable', 'string', 'max:2000'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
