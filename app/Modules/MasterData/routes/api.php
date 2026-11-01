<?php

use App\Modules\Foundation\Http\Middleware\ResolveTenant;
use App\Modules\MasterData\Http\Controllers\CustomerController;
use App\Modules\MasterData\Http\Controllers\ManufacturerController;
use App\Modules\MasterData\Http\Controllers\SupplierController;
use App\Modules\MasterData\Http\Controllers\UnitOfMeasurementController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', ResolveTenant::class])->group(function (): void {
    // Suppliers
    Route::get('/suppliers', [SupplierController::class, 'index'])->middleware('permission:master_data.view');
    Route::post('/suppliers', [SupplierController::class, 'store'])->middleware('permission:master_data.manage');
    Route::get('/suppliers/{supplier}', [SupplierController::class, 'show'])->middleware('permission:master_data.view');
    Route::put('/suppliers/{supplier}', [SupplierController::class, 'update'])->middleware('permission:master_data.manage');
    Route::delete('/suppliers/{supplier}', [SupplierController::class, 'destroy'])->middleware('permission:master_data.manage');

    // Customers
    Route::get('/customers', [CustomerController::class, 'index'])->middleware('permission:master_data.view');
    Route::post('/customers', [CustomerController::class, 'store'])->middleware('permission:master_data.manage');
    Route::get('/customers/{customer}', [CustomerController::class, 'show'])->middleware('permission:master_data.view');
    Route::put('/customers/{customer}', [CustomerController::class, 'update'])->middleware('permission:master_data.manage');
    Route::delete('/customers/{customer}', [CustomerController::class, 'destroy'])->middleware('permission:master_data.manage');

    // Manufacturers
    Route::get('/manufacturers', [ManufacturerController::class, 'index'])->middleware('permission:master_data.view');
    Route::post('/manufacturers', [ManufacturerController::class, 'store'])->middleware('permission:master_data.manage');
    Route::get('/manufacturers/{manufacturer}', [ManufacturerController::class, 'show'])->middleware('permission:master_data.view');
    Route::put('/manufacturers/{manufacturer}', [ManufacturerController::class, 'update'])->middleware('permission:master_data.manage');
    Route::delete('/manufacturers/{manufacturer}', [ManufacturerController::class, 'destroy'])->middleware('permission:master_data.manage');

    // Units of Measurement
    Route::get('/units-of-measurement', [UnitOfMeasurementController::class, 'index'])->middleware('permission:master_data.view');
    Route::post('/units-of-measurement', [UnitOfMeasurementController::class, 'store'])->middleware('permission:master_data.manage');
    Route::get('/units-of-measurement/{unitOfMeasurement}', [UnitOfMeasurementController::class, 'show'])->middleware('permission:master_data.view');
    Route::put('/units-of-measurement/{unitOfMeasurement}', [UnitOfMeasurementController::class, 'update'])->middleware('permission:master_data.manage');
    Route::delete('/units-of-measurement/{unitOfMeasurement}', [UnitOfMeasurementController::class, 'destroy'])->middleware('permission:master_data.manage');
});
