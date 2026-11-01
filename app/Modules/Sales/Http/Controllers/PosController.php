<?php

namespace App\Modules\Sales\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Catalog\Models\Medicine;
use App\Modules\Foundation\Models\Tenant;
use App\Modules\Inventory\Models\Batch;
use App\Modules\Inventory\Models\StockMovement;
use App\Modules\Sales\Http\Requests\CheckoutRequest;
use App\Modules\Sales\Http\Resources\PosProductResource;
use App\Modules\Sales\Http\Resources\SaleResource;
use App\Modules\Sales\Models\Sale;
use Dedoc\Scramble\Attributes\HeaderParameter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PosController extends Controller
{
    #[HeaderParameter('X-Tenant-ID', 'Selected pharmacy workspace ID.', true, type: 'integer')]
    public function searchProducts(Request $request): AnonymousResourceCollection
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');
        $query = Medicine::query()
            ->with(['batches'])
            ->where('tenant_id', $tenant->id)
            ->where('is_active', true);

        if ($search = $request->string('search')->trim()->toString()) {
            $query->where(function ($q) use ($search): void {
                $q->where('name', 'like', '%'.$search.'%')
                    ->orWhere('generic_name', 'like', '%'.$search.'%')
                    ->orWhere('sku', 'like', '%'.$search.'%')
                    ->orWhere('barcode', 'like', '%'.$search.'%');
            });
        }

        return PosProductResource::collection($query->orderBy('name')->paginate(30));
    }

    #[HeaderParameter('X-Tenant-ID', 'Selected pharmacy workspace ID.', true, type: 'integer')]
    public function checkout(CheckoutRequest $request): JsonResponse
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');
        $user = $request->user();
        $data = $request->validated();

        $sale = DB::transaction(function () use ($tenant, $user, $data): Sale {
            $invoiceNumber = 'INV-'.strtoupper(Str::random(8));
            $subtotal = 0;

            foreach ($data['items'] as $item) {
                $itemSubtotal = ($item['quantity'] * $item['unit_price']) - ($item['discount'] ?? 0);
                $subtotal += $itemSubtotal;
            }

            $discountAmount = $data['discount_amount'] ?? 0;
            $taxAmount = $data['tax_amount'] ?? 0;
            $totalAmount = max(0, $subtotal - $discountAmount + $taxAmount);
            $paidAmount = $data['paid_amount'];
            $changeAmount = max(0, $paidAmount - $totalAmount);

            $sale = Sale::query()->create([
                'tenant_id' => $tenant->id,
                'customer_id' => $data['customer_id'] ?? null,
                'invoice_number' => $invoiceNumber,
                'subtotal' => $subtotal,
                'discount_amount' => $discountAmount,
                'tax_amount' => $taxAmount,
                'total_amount' => $totalAmount,
                'paid_amount' => $paidAmount,
                'change_amount' => $changeAmount,
                'payment_method' => $data['payment_method'],
                'status' => 'completed',
                'served_by' => $user?->id,
            ]);

            foreach ($data['items'] as $item) {
                $qtyNeeded = (float) $item['quantity'];
                $unitType = $item['unit_type'] ?? 'strip';

                $medicine = Medicine::find($item['medicine_id']);
                $tabletsPerStrip = $medicine?->tablets_per_strip ?: 10;
                $stripsPerBox = $medicine?->strips_per_box ?: 10;

                $stockDeduction = $qtyNeeded;
                $multiplier = 1.0;
                if ($unitType === 'unit') {
                    $stockDeduction = round($qtyNeeded / max(1, $tabletsPerStrip), 3);
                    $multiplier = round(1.0 / max(1, $tabletsPerStrip), 3);
                } elseif ($unitType === 'box') {
                    $stockDeduction = round($qtyNeeded * max(1, $stripsPerBox), 3);
                    $multiplier = (float) $stripsPerBox;
                }

                // Select or FEFO match batch
                if (!empty($item['batch_id'])) {
                    $batch = Batch::query()
                        ->where('tenant_id', $tenant->id)
                        ->where('medicine_id', $item['medicine_id'])
                        ->lockForUpdate()
                        ->find($item['batch_id']);
                } else {
                    $batch = Batch::query()
                        ->where('tenant_id', $tenant->id)
                        ->where('medicine_id', $item['medicine_id'])
                        ->where('is_active', true)
                        ->where('quantity', '>', 0)
                        ->where('expiry_date', '>=', now()->toDateString())
                        ->orderBy('expiry_date', 'asc')
                        ->lockForUpdate()
                        ->first();
                }

                if ($batch && $batch->quantity < $stockDeduction) {
                    throw ValidationException::withMessages([
                        'items' => ["Insufficient stock for batch {$batch->batch_number}. Available: {$batch->quantity}, requested: {$stockDeduction}"],
                    ]);
                }

                $unitCost = $batch?->cost_price ?? 0;
                $itemSubtotal = ($item['quantity'] * $item['unit_price']) - ($item['discount'] ?? 0);

                $sale->items()->create([
                    'medicine_id' => $item['medicine_id'],
                    'batch_id' => $batch?->id,
                    'quantity' => $qtyNeeded,
                    'unit_type' => $unitType,
                    'units_multiplier' => $multiplier,
                    'unit_price' => $item['unit_price'],
                    'unit_cost' => $unitCost,
                    'discount' => $item['discount'] ?? 0,
                    'subtotal' => $itemSubtotal,
                ]);

                if ($batch) {
                    $batch->decrement('quantity', $stockDeduction);

                    StockMovement::query()->create([
                        'tenant_id' => $tenant->id,
                        'medicine_id' => $item['medicine_id'],
                        'batch_id' => $batch->id,
                        'type' => 'sale',
                        'quantity' => $stockDeduction,
                        'balance_after' => $batch->quantity,
                        'reference_type' => 'Sale',
                        'reference_id' => $sale->id,
                        'notes' => 'POS Sale '.$invoiceNumber,
                        'created_by' => $user?->id,
                    ]);
                }
            }

            // Record payment
            $sale->payments()->create([
                'tenant_id' => $tenant->id,
                'amount' => min($paidAmount, $totalAmount),
                'payment_method' => $data['payment_method'],
                'reference_number' => $invoiceNumber,
                'paid_at' => now(),
            ]);

            return $sale;
        });

        return (new SaleResource($sale->load(['customer', 'items.medicine', 'items.batch', 'server'])))
            ->response()
            ->setStatusCode(201);
    }
}
