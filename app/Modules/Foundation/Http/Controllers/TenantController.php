<?php

namespace App\Modules\Foundation\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Foundation\Http\Resources\TenantResource;
use App\Modules\Foundation\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class TenantController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        return TenantResource::collection($request->user()->tenants()->orderBy('name')->get());
    }

    public function showSettings(Request $request): JsonResponse
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');

        return response()->json([
            'data' => (new TenantResource($tenant))->resolve(),
        ]);
    }

    public function updateSettings(Request $request): JsonResponse
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');

        $validated = $request->validate([
            'allow_custom_pricing' => ['sometimes', 'boolean'],
            'max_discount_percentage' => ['sometimes', 'numeric', 'min:0', 'max:100'],
            'default_tax_rate' => ['sometimes', 'numeric', 'min:0', 'max:100'],
        ]);

        $tenant->update($validated);

        return response()->json([
            'message' => 'Pharmacy POS and operational settings updated successfully.',
            'data' => (new TenantResource($tenant->refresh()))->resolve(),
        ]);
    }
}
