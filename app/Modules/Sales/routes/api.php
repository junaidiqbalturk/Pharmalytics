<?php

use App\Modules\Foundation\Http\Middleware\ResolveTenant;
use App\Modules\Sales\Http\Controllers\PosController;
use App\Modules\Sales\Http\Controllers\SaleController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', ResolveTenant::class])->group(function (): void {
    // POS Terminal endpoints
    Route::get('/pos/products', [PosController::class, 'searchProducts'])->middleware('permission:sales.view');
    Route::post('/pos/checkout', [PosController::class, 'checkout'])->middleware('permission:sales.manage');

    // Sales history and receipts
    Route::get('/sales', [SaleController::class, 'index'])->middleware('permission:sales.view');
    Route::get('/sales/{sale}', [SaleController::class, 'show'])->middleware('permission:sales.view');
});
