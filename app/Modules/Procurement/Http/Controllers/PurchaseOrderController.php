<?php

namespace App\Modules\Procurement\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Foundation\Models\Tenant;
use App\Modules\Procurement\Http\Requests\StorePurchaseOrderRequest;
use App\Modules\Procurement\Http\Requests\UpdatePurchaseOrderRequest;
use App\Modules\Procurement\Http\Resources\PurchaseOrderResource;
use App\Modules\Procurement\Models\PurchaseOrder;
use Dedoc\Scramble\Attributes\HeaderParameter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PurchaseOrderController extends Controller
{
    #[HeaderParameter('X-Tenant-ID', 'Selected pharmacy workspace ID.', true, type: 'integer')]
    public function index(Request $request): AnonymousResourceCollection
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');
        $query = PurchaseOrder::query()
            ->with(['supplier', 'items.medicine', 'creator'])
            ->where('tenant_id', $tenant->id);

        if ($status = $request->string('status')->trim()->toString()) {
            $query->where('status', $status);
        }

        return PurchaseOrderResource::collection(
            $query->orderBy('id', 'desc')->paginate(25),
        );
    }

    #[HeaderParameter('X-Tenant-ID', 'Selected pharmacy workspace ID.', true, type: 'integer')]
    public function store(StorePurchaseOrderRequest $request): JsonResponse
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');
        $user = $request->user();
        $data = $request->validated();

        $po = DB::transaction(function () use ($tenant, $user, $data): PurchaseOrder {
            $poNumber = 'PO-'.strtoupper(Str::random(8));
            $totalAmount = 0;

            foreach ($data['items'] as $item) {
                $totalAmount += $item['quantity_ordered'] * $item['unit_price'];
            }

            $order = PurchaseOrder::query()->create([
                'tenant_id' => $tenant->id,
                'supplier_id' => $data['supplier_id'],
                'po_number' => $poNumber,
                'order_date' => $data['order_date'],
                'expected_date' => $data['expected_date'] ?? null,
                'status' => 'draft',
                'total_amount' => $totalAmount,
                'notes' => $data['notes'] ?? null,
                'created_by' => $user?->id,
            ]);

            foreach ($data['items'] as $item) {
                $subtotal = $item['quantity_ordered'] * $item['unit_price'];
                $order->items()->create([
                    'medicine_id' => $item['medicine_id'],
                    'quantity_ordered' => $item['quantity_ordered'],
                    'quantity_received' => 0,
                    'unit_price' => $item['unit_price'],
                    'subtotal' => $subtotal,
                ]);
            }

            return $order;
        });

        return (new PurchaseOrderResource($po->load(['supplier', 'items.medicine', 'creator'])))
            ->response()
            ->setStatusCode(201);
    }

    #[HeaderParameter('X-Tenant-ID', 'Selected pharmacy workspace ID.', true, type: 'integer')]
    public function show(Request $request, int $purchaseOrder): PurchaseOrderResource
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');
        $record = PurchaseOrder::query()
            ->with(['supplier', 'items.medicine', 'creator'])
            ->where('tenant_id', $tenant->id)
            ->findOrFail($purchaseOrder);

        return new PurchaseOrderResource($record);
    }

    #[HeaderParameter('X-Tenant-ID', 'Selected pharmacy workspace ID.', true, type: 'integer')]
    public function update(UpdatePurchaseOrderRequest $request, int $purchaseOrder): PurchaseOrderResource
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');
        $record = PurchaseOrder::query()
            ->where('tenant_id', $tenant->id)
            ->findOrFail($purchaseOrder);

        $record->update($request->validated());

        return new PurchaseOrderResource($record->refresh()->load(['supplier', 'items.medicine', 'creator']));
    }
}
