<?php

namespace App\Modules\Foundation\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TenantResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'currency_code' => $this->currency_code,
            'country_code' => $this->country_code ?? 'PK',
            'country' => $this->country ?? 'Pakistan',
            'timezone' => $this->timezone,
            'allow_custom_pricing' => (bool) ($this->allow_custom_pricing ?? false),
            'max_discount_percentage' => (string) ($this->max_discount_percentage ?? '20.00'),
            'default_tax_rate' => (string) ($this->default_tax_rate ?? '0.00'),
        ];
    }
}
