<?php

namespace App\Modules\MasterData\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateUnitOfMeasurementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:80'],
            'symbol' => ['sometimes', 'required', 'string', 'max:20'],
            'is_active' => ['nullable', 'boolean'],
        ];
    }
}
