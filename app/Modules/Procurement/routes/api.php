<?php

use App\Modules\Foundation\Http\Middleware\ResolveTenant;
use App\Modules\Procurement\Http\Controllers\GoodsReceiptController;
use App\Modules\Procurement\Http\Controllers\PurchaseOrderController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', ResolveTenant::class])->group(function (): void {
    // Purchase Orders
    Route::get('/purchase-orders', [PurchaseOrderController::class, 'index'])->middleware('permission:procurement.view');
    Route::post('/purchase-orders', [PurchaseOrderController::class, 'store'])->middleware('permission:procurement.manage');
    Route::get('/purchase-orders/{purchaseOrder}', [PurchaseOrderController::class, 'show'])->middleware('permission:procurement.view');
    Route::put('/purchase-orders/{purchaseOrder}', [PurchaseOrderController::class, 'update'])->middleware('permission:procurement.manage');

    // Goods Receipts (Receiving)
    Route::get('/goods-receipts', [GoodsReceiptController::class, 'index'])->middleware('permission:procurement.view');
    Route::post('/goods-receipts', [GoodsReceiptController::class, 'store'])->middleware('permission:procurement.manage');
    Route::get('/goods-receipts/{goodsReceipt}', [GoodsReceiptController::class, 'show'])->middleware('permission:procurement.view');
});
