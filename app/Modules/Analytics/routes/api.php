<?php

use App\Modules\Analytics\Http\Controllers\OwnerDashboardController;
use App\Modules\Foundation\Http\Middleware\ResolveTenant;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', ResolveTenant::class])->prefix('owner')->group(function (): void {
    Route::get('/dashboard', [OwnerDashboardController::class, 'dashboard']);
    Route::get('/sales-summary', [OwnerDashboardController::class, 'salesSummary']);
    Route::get('/inventory-summary', [OwnerDashboardController::class, 'inventorySummary']);
});
