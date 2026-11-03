<?php

namespace App\Modules\Inventory\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Foundation\Models\Tenant;
use App\Modules\Inventory\Http\Requests\StoreStockAdjustmentRequest;
use App\Modules\Inventory\Http\Resources\StockAdjustmentResource;
use App\Modules\Inventory\Models\Batch;
use App\Modules\Inventory\Models\StockAdjustment;
use App\Modules\Inventory\Models\StockMovement;
use Dedoc\Scramble\Attributes\HeaderParameter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class StockAdjustmentController extends Controller
{
    #[HeaderParameter('X-Tenant-ID', 'Selected pharmacy workspace ID.', true, type: 'integer')]
    public function index(Request $request): AnonymousResourceCollection
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');
        $query = StockAdjustment::query()
            ->with(['items.medicine', 'items.batch', 'creator'])
            ->where('tenant_id', $tenant->id);

        return StockAdjustmentResource::collection(
            $query->orderBy('id', 'desc')->paginate(25),
        );
    }

    #[HeaderParameter('X-Tenant-ID', 'Selected pharmacy workspace ID.', true, type: 'integer')]
    public function store(StoreStockAdjustmentRequest $request): JsonResponse
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');
        $user = $request->user();
        $data = $request->validated();

        $adjustment = DB::transaction(function () use ($tenant, $user, $data): StockAdjustment {
            $refNumber = 'ADJ-'.strtoupper(Str::random(8));

            $adjustment = StockAdjustment::query()->create([
                'tenant_id' => $tenant->id,
                'reference_number' => $refNumber,
                'reason' => $data['reason'],
                'status' => 'completed',
                'created_by' => $user?->id,
                'adjusted_at' => now(),
            ]);

            foreach ($data['items'] as $itemData) {
                $medicine = $tenant->medicines()->findOrFail($itemData['medicine_id']);

                $batch = Batch::query()
                    ->where('tenant_id', $tenant->id)
                    ->where('medicine_id', $medicine->id)
                    ->lockForUpdate()
                    ->find($itemData['batch_id']);

                if (! $batch) {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        'items' => ["The selected batch does not exist or does not belong to {$medicine->name}."],
                    ]);
                }

                $authoritativeSystemQuantity = (float) $batch->quantity;
                $countedQuantity = (float) $itemData['counted_quantity'];
                $difference = round($countedQuantity - $authoritativeSystemQuantity, 3);
                $unitCost = (float) ($itemData['unit_cost'] ?? ($batch->cost_price ?? $medicine->cost_price ?? 0));

                $adjustment->items()->create([
                    'medicine_id' => $medicine->id,
                    'batch_id' => $batch->id,
                    'system_quantity' => $authoritativeSystemQuantity,
                    'counted_quantity' => $countedQuantity,
                    'difference' => $difference,
                    'unit_cost' => $unitCost,
                ]);

                // Update batch quantity
                $batch->update(['quantity' => $countedQuantity]);

                // Log stock movement
                StockMovement::query()->create([
                    'tenant_id' => $tenant->id,
                    'medicine_id' => $medicine->id,
                    'batch_id' => $batch->id,
                    'type' => $difference >= 0 ? 'adjustment_in' : 'adjustment_out',
                    'quantity' => abs($difference),
                    'balance_after' => $countedQuantity,
                    'reference_type' => 'StockAdjustment',
                    'reference_id' => $adjustment->id,
                    'notes' => $data['reason'],
                    'created_by' => $user?->id,
                ]);
            }

            return $adjustment;
        });

        return (new StockAdjustmentResource($adjustment->load(['items.medicine', 'items.batch', 'creator'])))
            ->response()
            ->setStatusCode(201);
    }

    #[HeaderParameter('X-Tenant-ID', 'Selected pharmacy workspace ID.', true, type: 'integer')]
    public function show(Request $request, int $adjustment): StockAdjustmentResource
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');
        $record = StockAdjustment::query()
            ->with(['items.medicine', 'items.batch', 'creator'])
            ->where('tenant_id', $tenant->id)
            ->findOrFail($adjustment);

        return new StockAdjustmentResource($record);
    }
}
