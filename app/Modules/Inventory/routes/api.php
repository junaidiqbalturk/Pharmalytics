<?php

use App\Modules\Foundation\Http\Middleware\ResolveTenant;
use App\Modules\Inventory\Http\Controllers\BatchController;
use App\Modules\Inventory\Http\Controllers\StockAdjustmentController;
use App\Modules\Inventory\Http\Controllers\StockMovementController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', ResolveTenant::class])->group(function (): void {
    // Batches (FEFO inventory)
    Route::get('/batches', [BatchController::class, 'index'])->middleware('permission:inventory.view');
    Route::post('/batches', [BatchController::class, 'store'])->middleware('permission:inventory.manage');
    Route::get('/batches/{batch}', [BatchController::class, 'show'])->middleware('permission:inventory.view');
    Route::put('/batches/{batch}', [BatchController::class, 'update'])->middleware('permission:inventory.manage');

    // Stock Movements audit trail
    Route::get('/stock-movements', [StockMovementController::class, 'index'])->middleware('permission:inventory.view');

    // Stock Adjustments
    Route::get('/stock-adjustments', [StockAdjustmentController::class, 'index'])->middleware('permission:inventory.view');
    Route::post('/stock-adjustments', [StockAdjustmentController::class, 'store'])->middleware('permission:inventory.manage');
    Route::get('/stock-adjustments/{adjustment}', [StockAdjustmentController::class, 'show'])->middleware('permission:inventory.view');
});
