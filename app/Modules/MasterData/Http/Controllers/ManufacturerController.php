<?php

namespace App\Modules\MasterData\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Foundation\Models\Tenant;
use App\Modules\MasterData\Http\Requests\StoreManufacturerRequest;
use App\Modules\MasterData\Http\Requests\UpdateManufacturerRequest;
use App\Modules\MasterData\Http\Resources\ManufacturerResource;
use App\Modules\MasterData\Models\Manufacturer;
use Dedoc\Scramble\Attributes\HeaderParameter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class ManufacturerController extends Controller
{
    #[HeaderParameter('X-Tenant-ID', 'Selected pharmacy workspace ID.', true, type: 'integer')]
    public function index(Request $request): AnonymousResourceCollection
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');
        $query = Manufacturer::query()->where('tenant_id', $tenant->id);

        if ($search = $request->string('search')->trim()->toString()) {
            $query->where(function ($q) use ($search): void {
                $q->where('name', 'like', '%'.$search.'%')
                    ->orWhere('country', 'like', '%'.$search.'%');
            });
        }

        return ManufacturerResource::collection($query->orderBy('name')->paginate(25));
    }

    #[HeaderParameter('X-Tenant-ID', 'Selected pharmacy workspace ID.', true, type: 'integer')]
    public function store(StoreManufacturerRequest $request): JsonResponse
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');
        $record = Manufacturer::query()->create([
            ...$request->validated(),
            'tenant_id' => $tenant->id,
        ]);

        return (new ManufacturerResource($record->refresh()))
            ->response()
            ->setStatusCode(201);
    }

    #[HeaderParameter('X-Tenant-ID', 'Selected pharmacy workspace ID.', true, type: 'integer')]
    public function show(Request $request, int $manufacturer): ManufacturerResource
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');
        $record = Manufacturer::query()->where('tenant_id', $tenant->id)->findOrFail($manufacturer);

        return new ManufacturerResource($record);
    }

    #[HeaderParameter('X-Tenant-ID', 'Selected pharmacy workspace ID.', true, type: 'integer')]
    public function update(UpdateManufacturerRequest $request, int $manufacturer): ManufacturerResource
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');
        $record = Manufacturer::query()->where('tenant_id', $tenant->id)->findOrFail($manufacturer);
        $record->update($request->validated());

        return new ManufacturerResource($record->refresh());
    }

    #[HeaderParameter('X-Tenant-ID', 'Selected pharmacy workspace ID.', true, type: 'integer')]
    public function destroy(Request $request, int $manufacturer): Response
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');
        Manufacturer::query()->where('tenant_id', $tenant->id)->findOrFail($manufacturer)->update(['is_active' => false]);

        return response()->noContent();
    }
}
