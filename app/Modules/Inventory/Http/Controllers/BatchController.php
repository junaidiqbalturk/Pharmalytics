<?php

namespace App\Modules\Inventory\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Foundation\Models\Tenant;
use App\Modules\Inventory\Http\Requests\StoreBatchRequest;
use App\Modules\Inventory\Http\Requests\UpdateBatchRequest;
use App\Modules\Inventory\Http\Resources\BatchResource;
use App\Modules\Inventory\Models\Batch;
use App\Modules\Inventory\Models\StockMovement;
use Dedoc\Scramble\Attributes\HeaderParameter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class BatchController extends Controller
{
    #[HeaderParameter('X-Tenant-ID', 'Selected pharmacy workspace ID.', true, type: 'integer')]
    public function index(Request $request): AnonymousResourceCollection
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');
        $query = Batch::query()
            ->with('medicine')
            ->where('tenant_id', $tenant->id);

        if ($medicineId = $request->integer('medicine_id')) {
            $query->where('medicine_id', $medicineId);
        }

        if ($search = $request->string('search')->trim()->toString()) {
            $query->where(function ($q) use ($search): void {
                $q->where('batch_number', 'like', '%'.$search.'%')
                    ->orWhereHas('medicine', function ($mq) use ($search): void {
                        $mq->where('name', 'like', '%'.$search.'%');
                    });
            });
        }

        // FEFO order: earliest expiry date first
        return BatchResource::collection(
            $query->orderBy('expiry_date', 'asc')->paginate(25),
        );
    }

    #[HeaderParameter('X-Tenant-ID', 'Selected pharmacy workspace ID.', true, type: 'integer')]
    public function store(StoreBatchRequest $request): JsonResponse
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');
        $data = $request->validated();
        $user = $request->user();

        $batch = DB::transaction(function () use ($tenant, $data, $user): Batch {
            $batch = Batch::query()->create([
                ...$data,
                'tenant_id' => $tenant->id,
            ]);

            StockMovement::query()->create([
                'tenant_id' => $tenant->id,
                'medicine_id' => $batch->medicine_id,
                'batch_id' => $batch->id,
                'type' => 'opening_stock',
                'quantity' => $batch->quantity,
                'balance_after' => $batch->quantity,
                'reference_type' => 'Batch',
                'reference_id' => $batch->id,
                'notes' => 'Initial batch registration',
                'created_by' => $user?->id,
            ]);

            return $batch;
        });

        return (new BatchResource($batch->load('medicine')))
            ->response()
            ->setStatusCode(201);
    }

    #[HeaderParameter('X-Tenant-ID', 'Selected pharmacy workspace ID.', true, type: 'integer')]
    public function show(Request $request, int $batch): BatchResource
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');
        $record = Batch::query()
            ->with('medicine')
            ->where('tenant_id', $tenant->id)
            ->findOrFail($batch);

        return new BatchResource($record);
    }

    #[HeaderParameter('X-Tenant-ID', 'Selected pharmacy workspace ID.', true, type: 'integer')]
    public function update(UpdateBatchRequest $request, int $batch): BatchResource
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');
        $record = Batch::query()
            ->where('tenant_id', $tenant->id)
            ->findOrFail($batch);

        $record->update($request->validated());

        return new BatchResource($record->refresh()->load('medicine'));
    }
}
