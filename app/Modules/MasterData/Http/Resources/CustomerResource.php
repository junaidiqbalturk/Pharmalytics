<?php

namespace App\Modules\MasterData\Http\Resources;

use App\Modules\MasterData\Models\Customer;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Customer
 */
class CustomerResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'phone' => $this->phone,
            'email' => $this->email,
            'address' => $this->address,
            'loyalty_code' => $this->loyalty_code,
            'credit_limit' => (string) $this->credit_limit,
            'balance' => (string) $this->balance,
            'is_active' => $this->is_active,
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
