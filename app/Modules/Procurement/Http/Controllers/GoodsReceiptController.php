<?php

namespace App\Modules\Procurement\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Foundation\Models\Tenant;
use App\Modules\Inventory\Models\Batch;
use App\Modules\Inventory\Models\StockMovement;
use App\Modules\Procurement\Http\Requests\StoreGoodsReceiptRequest;
use App\Modules\Procurement\Http\Resources\GoodsReceiptResource;
use App\Modules\Procurement\Models\GoodsReceipt;
use App\Modules\Procurement\Models\PurchaseOrder;
use Dedoc\Scramble\Attributes\HeaderParameter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class GoodsReceiptController extends Controller
{
    #[HeaderParameter('X-Tenant-ID', 'Selected pharmacy workspace ID.', true, type: 'integer')]
    public function index(Request $request): AnonymousResourceCollection
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');
        $query = GoodsReceipt::query()
            ->with(['supplier', 'items.medicine', 'creator'])
            ->where('tenant_id', $tenant->id);

        return GoodsReceiptResource::collection(
            $query->orderBy('id', 'desc')->paginate(25),
        );
    }

    #[HeaderParameter('X-Tenant-ID', 'Selected pharmacy workspace ID.', true, type: 'integer')]
    public function store(StoreGoodsReceiptRequest $request): JsonResponse
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');
        $user = $request->user();
        $data = $request->validated();

        $receipt = DB::transaction(function () use ($tenant, $user, $data): GoodsReceipt {
            $grnNumber = 'GRN-'.strtoupper(Str::random(8));
            $totalAmount = 0;

            foreach ($data['items'] as $item) {
                $totalAmount += $item['quantity_received'] * $item['unit_cost'];
            }

            $goodsReceipt = GoodsReceipt::query()->create([
                'tenant_id' => $tenant->id,
                'purchase_order_id' => $data['purchase_order_id'] ?? null,
                'supplier_id' => $data['supplier_id'],
                'grn_number' => $grnNumber,
                'invoice_number' => $data['invoice_number'] ?? null,
                'received_date' => $data['received_date'],
                'total_amount' => $totalAmount,
                'payment_status' => 'unpaid',
                'notes' => $data['notes'] ?? null,
                'created_by' => $user?->id,
            ]);

            foreach ($data['items'] as $item) {
                $subtotal = $item['quantity_received'] * $item['unit_cost'];

                $goodsReceipt->items()->create([
                    'medicine_id' => $item['medicine_id'],
                    'batch_number' => $item['batch_number'],
                    'expiry_date' => $item['expiry_date'],
                    'quantity_received' => $item['quantity_received'],
                    'unit_cost' => $item['unit_cost'],
                    'selling_price' => $item['selling_price'],
                    'subtotal' => $subtotal,
                ]);

                // Create or increment batch
                /** @var Batch $batch */
                $batch = Batch::query()->firstOrNew([
                    'tenant_id' => $tenant->id,
                    'medicine_id' => $item['medicine_id'],
                    'batch_number' => $item['batch_number'],
                ]);

                $oldQuantity = $batch->exists ? $batch->quantity : 0;
                $batch->expiry_date = $item['expiry_date'];
                $batch->cost_price = $item['unit_cost'];
                $batch->selling_price = $item['selling_price'];
                $batch->quantity = $oldQuantity + $item['quantity_received'];
                $batch->is_active = true;
                $batch->save();

                // Log Stock Movement
                StockMovement::query()->create([
                    'tenant_id' => $tenant->id,
                    'medicine_id' => $item['medicine_id'],
                    'batch_id' => $batch->id,
                    'type' => 'purchase',
                    'quantity' => $item['quantity_received'],
                    'balance_after' => $batch->quantity,
                    'reference_type' => 'GoodsReceipt',
                    'reference_id' => $goodsReceipt->id,
                    'notes' => 'Stock received under GRN '.$grnNumber,
                    'created_by' => $user?->id,
                ]);

                // Update PO item received quantity if linked
                if (!empty($data['purchase_order_id'])) {
                    $po = PurchaseOrder::query()->where('tenant_id', $tenant->id)->find($data['purchase_order_id']);
                    if ($po) {
                        $poItem = $po->items()->where('medicine_id', $item['medicine_id'])->first();
                        if ($poItem) {
                            $poItem->increment('quantity_received', $item['quantity_received']);
                        }
                    }
                }
            }

            // Update PO status to received if all items satisfied
            if (!empty($data['purchase_order_id'])) {
                $po = PurchaseOrder::query()->where('tenant_id', $tenant->id)->find($data['purchase_order_id']);
                if ($po) {
                    $allReceived = $po->items()->whereColumn('quantity_received', '<', 'quantity_ordered')->doesntExist();
                    $po->update(['status' => $allReceived ? 'received' : 'partial']);
                }
            }

            // Automatic Double-Entry to Accounting for GRN if default accounts exist
            $inventoryAccount = \App\Modules\Accounting\Models\ChartOfAccount::query()
                ->where('tenant_id', $tenant->id)
                ->where('code', '1200')
                ->where('is_active', true)
                ->first();

            $payableAccount = \App\Modules\Accounting\Models\ChartOfAccount::query()
                ->where('tenant_id', $tenant->id)
                ->where('code', '2010')
                ->where('is_active', true)
                ->first();

            if ($inventoryAccount && $payableAccount && $totalAmount > 0) {
                $entry = \App\Modules\Accounting\Models\JournalEntry::query()->create([
                    'tenant_id' => $tenant->id,
                    'entry_number' => 'JE-'.strtoupper(Str::random(8)),
                    'date' => $data['received_date'] ?? now()->toDateString(),
                    'description' => 'Automated Goods Intake Entry '.$grnNumber,
                    'reference_type' => 'GoodsReceipt',
                    'reference_id' => $goodsReceipt->id,
                    'status' => 'posted',
                    'created_by' => $user?->id,
                ]);

                $entry->items()->create([
                    'chart_of_account_id' => $inventoryAccount->id,
                    'type' => 'debit',
                    'amount' => $totalAmount,
                    'description' => 'Inventory asset intake under GRN',
                ]);

                $entry->items()->create([
                    'chart_of_account_id' => $payableAccount->id,
                    'type' => 'credit',
                    'amount' => $totalAmount,
                    'description' => 'Accounts payable liability for GRN',
                ]);
            }

            return $goodsReceipt;
        });

        return (new GoodsReceiptResource($receipt->load(['supplier', 'items.medicine', 'creator'])))
            ->response()
            ->setStatusCode(201);
    }

    #[HeaderParameter('X-Tenant-ID', 'Selected pharmacy workspace ID.', true, type: 'integer')]
    public function show(Request $request, int $receipt): GoodsReceiptResource
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');
        $record = GoodsReceipt::query()
            ->with(['supplier', 'items.medicine', 'creator'])
            ->where('tenant_id', $tenant->id)
            ->findOrFail($receipt);

        return new GoodsReceiptResource($record);
    }
}
