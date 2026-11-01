<?php

namespace App\Modules\Sales\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Foundation\Models\Tenant;
use App\Modules\Sales\Http\Resources\SaleResource;
use App\Modules\Sales\Models\Sale;
use Dedoc\Scramble\Attributes\HeaderParameter;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class SaleController extends Controller
{
    #[HeaderParameter('X-Tenant-ID', 'Selected pharmacy workspace ID.', true, type: 'integer')]
    public function index(Request $request): AnonymousResourceCollection
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');
        $query = Sale::query()
            ->with(['customer', 'items.medicine', 'items.batch', 'server'])
            ->where('tenant_id', $tenant->id);

        if ($search = $request->string('search')->trim()->toString()) {
            $query->where('invoice_number', 'like', '%'.$search.'%');
        }

        return SaleResource::collection(
            $query->orderBy('id', 'desc')->paginate(25),
        );
    }

    #[HeaderParameter('X-Tenant-ID', 'Selected pharmacy workspace ID.', true, type: 'integer')]
    public function show(Request $request, int $sale): SaleResource
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');
        $record = Sale::query()
            ->with(['customer', 'items.medicine', 'items.batch', 'server'])
            ->where('tenant_id', $tenant->id)
            ->findOrFail($sale);

        return new SaleResource($record);
    }
}
