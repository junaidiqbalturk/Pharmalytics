<?php

namespace App\Modules\Foundation\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'confirmed', Password::min(12)->mixedCase()->numbers()],
            'device_name' => ['sometimes', 'string', 'max:120'],
            'tenant.name' => ['required', 'string', 'max:160'],
            'tenant.slug' => ['sometimes', 'nullable', 'string', 'max:180', 'alpha_dash', 'unique:tenants,slug'],
            'tenant.currency_code' => ['sometimes', 'string', 'size:3', 'alpha'],
            'tenant.country_code' => ['sometimes', 'string', 'size:2', 'alpha'],
            'tenant.country' => ['sometimes', 'string', 'max:100'],
            'tenant.timezone' => ['sometimes', 'string', 'timezone'],
        ];
    }
}
