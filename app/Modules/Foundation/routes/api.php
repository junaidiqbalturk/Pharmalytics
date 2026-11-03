<?php

use App\Modules\Foundation\Http\Controllers\AuthController;
use App\Modules\Foundation\Http\Controllers\MedicineCategoryController;
use App\Modules\Foundation\Http\Controllers\TenantController;
use App\Modules\Foundation\Http\Middleware\ResolveTenant;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function (): void {
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:5,1');
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1');
    Route::middleware('auth:sanctum')->group(function (): void {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });
});

Route::middleware('auth:sanctum')->group(function (): void {
    Route::get('/tenants', [TenantController::class, 'index']);

    Route::middleware(ResolveTenant::class)->group(function (): void {
        Route::get('/staff', [\App\Modules\Foundation\Http\Controllers\StaffController::class, 'index'])->middleware('permission:staff.view');
        Route::post('/staff', [\App\Modules\Foundation\Http\Controllers\StaffController::class, 'store'])->middleware('permission:staff.manage');
        Route::delete('/staff/{id}', [\App\Modules\Foundation\Http\Controllers\StaffController::class, 'destroy'])->middleware('permission:staff.manage');

        Route::get('/medicine-categories', [MedicineCategoryController::class, 'index'])->middleware('permission:catalog.view');
        Route::post('/medicine-categories', [MedicineCategoryController::class, 'store'])->middleware('permission:catalog.manage');
        Route::put('/medicine-categories/{category}', [MedicineCategoryController::class, 'update'])->middleware('permission:catalog.manage');
        Route::delete('/medicine-categories/{category}', [MedicineCategoryController::class, 'destroy'])->middleware('permission:catalog.manage');
    });
});
