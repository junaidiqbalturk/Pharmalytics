<?php

namespace App\Modules\MasterData\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Foundation\Models\Tenant;
use App\Modules\MasterData\Http\Requests\StoreUnitOfMeasurementRequest;
use App\Modules\MasterData\Http\Requests\UpdateUnitOfMeasurementRequest;
use App\Modules\MasterData\Http\Resources\UnitOfMeasurementResource;
use App\Modules\MasterData\Models\UnitOfMeasurement;
use Dedoc\Scramble\Attributes\HeaderParameter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class UnitOfMeasurementController extends Controller
{
    #[HeaderParameter('X-Tenant-ID', 'Selected pharmacy workspace ID.', true, type: 'integer')]
    public function index(Request $request): AnonymousResourceCollection
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');
        $query = UnitOfMeasurement::query()->where('tenant_id', $tenant->id);

        if ($search = $request->string('search')->trim()->toString()) {
            $query->where(function ($q) use ($search): void {
                $q->where('name', 'like', '%'.$search.'%')
                    ->orWhere('symbol', 'like', '%'.$search.'%');
            });
        }

        return UnitOfMeasurementResource::collection($query->orderBy('name')->paginate(25));
    }

    #[HeaderParameter('X-Tenant-ID', 'Selected pharmacy workspace ID.', true, type: 'integer')]
    public function store(StoreUnitOfMeasurementRequest $request): JsonResponse
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');
        $record = UnitOfMeasurement::query()->create([
            ...$request->validated(),
            'tenant_id' => $tenant->id,
        ]);

        return (new UnitOfMeasurementResource($record->refresh()))
            ->response()
            ->setStatusCode(201);
    }

    #[HeaderParameter('X-Tenant-ID', 'Selected pharmacy workspace ID.', true, type: 'integer')]
    public function show(Request $request, int $unitOfMeasurement): UnitOfMeasurementResource
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');
        $record = UnitOfMeasurement::query()->where('tenant_id', $tenant->id)->findOrFail($unitOfMeasurement);

        return new UnitOfMeasurementResource($record);
    }

    #[HeaderParameter('X-Tenant-ID', 'Selected pharmacy workspace ID.', true, type: 'integer')]
    public function update(UpdateUnitOfMeasurementRequest $request, int $unitOfMeasurement): UnitOfMeasurementResource
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');
        $record = UnitOfMeasurement::query()->where('tenant_id', $tenant->id)->findOrFail($unitOfMeasurement);
        $record->update($request->validated());

        return new UnitOfMeasurementResource($record->refresh());
    }

    #[HeaderParameter('X-Tenant-ID', 'Selected pharmacy workspace ID.', true, type: 'integer')]
    public function destroy(Request $request, int $unitOfMeasurement): Response
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');
        UnitOfMeasurement::query()->where('tenant_id', $tenant->id)->findOrFail($unitOfMeasurement)->update(['is_active' => false]);

        return response()->noContent();
    }
}
