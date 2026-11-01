<?php

namespace App\Modules\MasterData\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Foundation\Models\Tenant;
use App\Modules\MasterData\Http\Requests\StoreSupplierRequest;
use App\Modules\MasterData\Http\Requests\UpdateSupplierRequest;
use App\Modules\MasterData\Http\Resources\SupplierResource;
use App\Modules\MasterData\Models\Supplier;
use Dedoc\Scramble\Attributes\HeaderParameter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class SupplierController extends Controller
{
    #[HeaderParameter('X-Tenant-ID', 'Selected pharmacy workspace ID.', true, type: 'integer')]
    public function index(Request $request): AnonymousResourceCollection
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');
        $query = Supplier::query()->where('tenant_id', $tenant->id);

        if ($search = $request->string('search')->trim()->toString()) {
            $query->where(function ($q) use ($search): void {
                $q->where('name', 'like', '%'.$search.'%')
                    ->orWhere('contact_person', 'like', '%'.$search.'%')
                    ->orWhere('email', 'like', '%'.$search.'%')
                    ->orWhere('phone', 'like', '%'.$search.'%');
            });
        }

        return SupplierResource::collection($query->orderBy('name')->paginate(25));
    }

    #[HeaderParameter('X-Tenant-ID', 'Selected pharmacy workspace ID.', true, type: 'integer')]
    public function store(StoreSupplierRequest $request): JsonResponse
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');
        $supplier = Supplier::query()->create([
            ...$request->validated(),
            'tenant_id' => $tenant->id,
        ]);

        return (new SupplierResource($supplier->refresh()))
            ->response()
            ->setStatusCode(201);
    }

    #[HeaderParameter('X-Tenant-ID', 'Selected pharmacy workspace ID.', true, type: 'integer')]
    public function show(Request $request, int $supplier): SupplierResource
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');
        $record = Supplier::query()->where('tenant_id', $tenant->id)->findOrFail($supplier);

        return new SupplierResource($record);
    }

    #[HeaderParameter('X-Tenant-ID', 'Selected pharmacy workspace ID.', true, type: 'integer')]
    public function update(UpdateSupplierRequest $request, int $supplier): SupplierResource
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');
        $record = Supplier::query()->where('tenant_id', $tenant->id)->findOrFail($supplier);
        $record->update($request->validated());

        return new SupplierResource($record->refresh());
    }

    #[HeaderParameter('X-Tenant-ID', 'Selected pharmacy workspace ID.', true, type: 'integer')]
    public function destroy(Request $request, int $supplier): Response
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');
        Supplier::query()->where('tenant_id', $tenant->id)->findOrFail($supplier)->update(['is_active' => false]);

        return response()->noContent();
    }
}
