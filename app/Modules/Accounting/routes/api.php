<?php

use App\Modules\Accounting\Http\Controllers\ChartOfAccountController;
use App\Modules\Accounting\Http\Controllers\JournalEntryController;
use App\Modules\Foundation\Http\Middleware\ResolveTenant;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', ResolveTenant::class])->group(function (): void {
    // Chart of Accounts
    Route::get('/chart-of-accounts', [ChartOfAccountController::class, 'index'])->middleware('permission:accounting.view');
    Route::post('/chart-of-accounts', [ChartOfAccountController::class, 'store'])->middleware('permission:accounting.manage');
    Route::get('/chart-of-accounts/{chartOfAccount}', [ChartOfAccountController::class, 'show'])->middleware('permission:accounting.view');
    Route::put('/chart-of-accounts/{chartOfAccount}', [ChartOfAccountController::class, 'update'])->middleware('permission:accounting.manage');
    Route::delete('/chart-of-accounts/{chartOfAccount}', [ChartOfAccountController::class, 'destroy'])->middleware('permission:accounting.manage');

    // Journal Entries & General Ledger
    Route::get('/journal-entries', [JournalEntryController::class, 'index'])->middleware('permission:accounting.view');
    Route::post('/journal-entries', [JournalEntryController::class, 'store'])->middleware('permission:accounting.manage');
    Route::get('/journal-entries/{journalEntry}', [JournalEntryController::class, 'show'])->middleware('permission:accounting.view');
    Route::get('/accounts/{chartOfAccount}/ledger', [JournalEntryController::class, 'ledger'])->middleware('permission:accounting.view');
});
