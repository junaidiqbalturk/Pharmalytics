<?php

use App\Modules\Catalog\Http\Controllers\MedicineController;
use App\Modules\Foundation\Http\Middleware\ResolveTenant;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', ResolveTenant::class, 'permission:catalog.view'])->group(function (): void {
    Route::get('/medicines', [MedicineController::class, 'index']);
    Route::get('/medicines/{medicine}', [MedicineController::class, 'show']);
});

Route::middleware(['auth:sanctum', ResolveTenant::class, 'permission:catalog.manage'])->group(function (): void {
    Route::post('/medicines', [MedicineController::class, 'store']);
    Route::put('/medicines/{medicine}', [MedicineController::class, 'update']);
    Route::delete('/medicines/{medicine}', [MedicineController::class, 'destroy']);
});
