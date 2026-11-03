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

            $customerId = null;
            if (!empty($data['customer_id'])) {
                $customer = \App\Modules\MasterData\Models\Customer::query()
                    ->where('tenant_id', $tenant->id)
                    ->findOrFail($data['customer_id']);
                $customerId = $customer->id;
            }

            // 1. Resolve and validate all items, batches, and authoritative prices
            $processedItems = [];
            $subtotal = 0;

            foreach ($data['items'] as $item) {
                $medicine = $tenant->medicines()->findOrFail($item['medicine_id']);
                $qtyNeeded = (float) $item['quantity'];
                $unitType = $item['unit_type'] ?? 'strip';

                $tabletsPerStrip = $medicine->tablets_per_strip ?: 10;
                $stripsPerBox = $medicine->strips_per_box ?: 10;

                $stockDeduction = $qtyNeeded;
                $multiplier = 1.0;
                if ($unitType === 'unit') {
                    $stockDeduction = round($qtyNeeded / max(1, $tabletsPerStrip), 3);
                    $multiplier = round(1.0 / max(1, $tabletsPerStrip), 3);
                } elseif ($unitType === 'box') {
                    $stockDeduction = round($qtyNeeded * max(1, $stripsPerBox), 3);
                    $multiplier = (float) $stripsPerBox;
                }

                // Strictly select or FEFO match batch with pessimistic lock
                if (!empty($item['batch_id'])) {
                    $batch = Batch::query()
                        ->where('tenant_id', $tenant->id)
                        ->where('medicine_id', $medicine->id)
                        ->where('is_active', true)
                        ->where('expiry_date', '>=', now()->toDateString())
                        ->lockForUpdate()
                        ->find($item['batch_id']);
                } else {
                    $batch = Batch::query()
                        ->where('tenant_id', $tenant->id)
                        ->where('medicine_id', $medicine->id)
                        ->where('is_active', true)
                        ->where('quantity', '>', 0)
                        ->where('expiry_date', '>=', now()->toDateString())
                        ->orderBy('expiry_date', 'asc')
                        ->lockForUpdate()
                        ->first();
                }

                if (! $batch) {
                    throw ValidationException::withMessages([
                        'items' => ["No valid, active, non-expired batch found with stock for {$medicine->name}."],
                    ]);
                }

                if ($batch->quantity < $stockDeduction) {
                    throw ValidationException::withMessages([
                        'items' => ["Insufficient stock for batch {$batch->batch_number} ({$medicine->name}). Available: {$batch->quantity}, requested: {$stockDeduction}."],
                    ]);
                }

                // Authoritative price calculation based on database records
                $batchSellingPrice = (float) ($batch->selling_price > 0 ? $batch->selling_price : ($medicine->selling_price ?? 0));
                $pricePerStrip = (float) ($medicine->price_per_strip > 0 ? $medicine->price_per_strip : $batchSellingPrice);
                $pricePerUnit = (float) ($medicine->price_per_unit > 0 ? $medicine->price_per_unit : round($pricePerStrip / max(1, $tabletsPerStrip), 2));
                $pricePerBox = (float) ($medicine->price_per_box > 0 ? $medicine->price_per_box : round($pricePerStrip * max(1, $stripsPerBox), 2));

                if ($unitType === 'unit') {
                    $authoritativeUnitPrice = $pricePerUnit;
                } elseif ($unitType === 'box') {
                    $authoritativeUnitPrice = $pricePerBox;
                } else {
                    $authoritativeUnitPrice = $pricePerStrip;
                }

                if ($authoritativeUnitPrice <= 0) {
                    $canCustomPrice = (bool) ($tenant->allow_custom_pricing ?? false)
                        && ($user?->hasRole(['owner', 'admin']) || $user?->can('sales.manage'));

                    if ($canCustomPrice && isset($item['unit_price']) && (float) $item['unit_price'] > 0) {
                        $authoritativeUnitPrice = (float) $item['unit_price'];
                    } else {
                        throw ValidationException::withMessages([
                            'items' => ["Medicine '{$medicine->name}' does not have a valid selling price configured in catalog. Dispensing unpriced items is restricted by pharmacy policy."],
                        ]);
                    }
                }

                $itemGross = round($qtyNeeded * $authoritativeUnitPrice, 2);
                $itemDiscount = (float) ($item['discount'] ?? 0);
                if ($itemDiscount < 0 || $itemDiscount > $itemGross) {
                    throw ValidationException::withMessages([
                        'items' => ["Discount for {$medicine->name} cannot exceed the item total of {$itemGross}."],
                    ]);
                }

                $maxDiscountRate = (float) ($tenant->max_discount_percentage ?? 20.00);
                $isManager = $user?->hasRole(['owner', 'admin']);

                if (! $isManager && $itemGross > 0) {
                    $lineDiscountPercentage = round(($itemDiscount / $itemGross) * 100, 2);
                    if ($lineDiscountPercentage > $maxDiscountRate) {
                        throw ValidationException::withMessages([
                            'items' => ["Line discount of {$lineDiscountPercentage}% for {$medicine->name} exceeds the pharmacy policy limit ({$maxDiscountRate}%). Manager override required."],
                        ]);
                    }
                }

                $itemSubtotal = $itemGross - $itemDiscount;
                $subtotal += $itemSubtotal;

                $processedItems[] = [
                    'medicine' => $medicine,
                    'batch' => $batch,
                    'quantity' => $qtyNeeded,
                    'unit_type' => $unitType,
                    'multiplier' => $multiplier,
                    'stock_deduction' => $stockDeduction,
                    'unit_price' => $authoritativeUnitPrice,
                    'unit_cost' => (float) ($batch->cost_price ?? $medicine->cost_price ?? 0),
                    'discount' => $itemDiscount,
                    'subtotal' => $itemSubtotal,
                ];
            }

            $discountAmount = min($subtotal, (float) ($data['discount_amount'] ?? 0));
            if (! ($user?->hasRole(['owner', 'admin'])) && $subtotal > 0) {
                $maxDiscountRate = (float) ($tenant->max_discount_percentage ?? 20.00);
                $totalDiscountPercentage = round(($discountAmount / $subtotal) * 100, 2);
                if ($totalDiscountPercentage > $maxDiscountRate) {
                    throw ValidationException::withMessages([
                        'discount_amount' => ["Order discount of {$totalDiscountPercentage}% exceeds the pharmacy policy limit ({$maxDiscountRate}%). Manager override required."],
                    ]);
                }
            }

            // Authoritative server-side tax calculation based on tenant policy
            $taxRate = (float) ($tenant->default_tax_rate ?? 0.00);
            if ($taxRate > 0) {
                $taxableAmount = max(0, $subtotal - $discountAmount);
                $taxAmount = round($taxableAmount * ($taxRate / 100), 2);
            } else {
                $taxAmount = 0.00;
            }
            $totalAmount = max(0, round($subtotal - $discountAmount + $taxAmount, 2));
            $paidAmount = (float) $data['paid_amount'];

            if ($paidAmount < $totalAmount && $data['payment_method'] !== 'credit') {
                throw ValidationException::withMessages([
                    'paid_amount' => ["Paid amount ({$paidAmount}) cannot be less than total amount ({$totalAmount})."],
                ]);
            }

            $changeAmount = max(0, round($paidAmount - $totalAmount, 2));

            $sale = Sale::query()->create([
                'tenant_id' => $tenant->id,
                'customer_id' => $customerId,
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

            foreach ($processedItems as $pItem) {
                /** @var Batch $batch */
                $batch = $pItem['batch'];
                /** @var Medicine $medicine */
                $medicine = $pItem['medicine'];

                $sale->items()->create([
                    'medicine_id' => $medicine->id,
                    'batch_id' => $batch->id,
                    'quantity' => $pItem['quantity'],
                    'unit_type' => $pItem['unit_type'],
                    'units_multiplier' => $pItem['multiplier'],
                    'unit_price' => $pItem['unit_price'],
                    'unit_cost' => $pItem['unit_cost'],
                    'discount' => $pItem['discount'],
                    'subtotal' => $pItem['subtotal'],
                ]);

                $batch->decrement('quantity', $pItem['stock_deduction']);

                StockMovement::query()->create([
                    'tenant_id' => $tenant->id,
                    'medicine_id' => $medicine->id,
                    'batch_id' => $batch->id,
                    'type' => 'sale',
                    'quantity' => $pItem['stock_deduction'],
                    'balance_after' => $batch->quantity,
                    'reference_type' => 'Sale',
                    'reference_id' => $sale->id,
                    'notes' => 'POS Sale '.$invoiceNumber,
                    'created_by' => $user?->id,
                ]);
            }

            // Record payment
            $sale->payments()->create([
                'tenant_id' => $tenant->id,
                'amount' => min($paidAmount, $totalAmount),
                'payment_method' => $data['payment_method'],
                'reference_number' => $invoiceNumber,
                'paid_at' => now(),
            ]);

            // Automatic Double-Entry to Accounting if default accounts exist
            $cashAccount = \App\Modules\Accounting\Models\ChartOfAccount::query()
                ->where('tenant_id', $tenant->id)
                ->where('code', '1010')
                ->where('is_active', true)
                ->first();

            $salesAccount = \App\Modules\Accounting\Models\ChartOfAccount::query()
                ->where('tenant_id', $tenant->id)
                ->where('code', '4010')
                ->where('is_active', true)
                ->first();

            if ($cashAccount && $salesAccount && $totalAmount > 0) {
                $entry = \App\Modules\Accounting\Models\JournalEntry::query()->create([
                    'tenant_id' => $tenant->id,
                    'entry_number' => 'JE-'.strtoupper(Str::random(8)),
                    'date' => now()->toDateString(),
                    'description' => 'Automated POS Sale Entry '.$invoiceNumber,
                    'reference_type' => 'Sale',
                    'reference_id' => $sale->id,
                    'status' => 'posted',
                    'created_by' => $user?->id,
                ]);

                $entry->items()->create([
                    'chart_of_account_id' => $cashAccount->id,
                    'type' => 'debit',
                    'amount' => $totalAmount,
                    'description' => 'Cash received from POS sale',
                ]);

                $entry->items()->create([
                    'chart_of_account_id' => $salesAccount->id,
                    'type' => 'credit',
                    'amount' => $totalAmount,
                    'description' => 'POS OTC medicine sales revenue',
                ]);
            }

            return $sale;
        });

        return (new SaleResource($sale->load(['customer', 'items.medicine', 'items.batch', 'server'])))
            ->response()
            ->setStatusCode(201);
    }
}
