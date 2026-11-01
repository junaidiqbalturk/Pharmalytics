<?php

use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    require __DIR__.'/../app/Modules/Foundation/routes/api.php';
    require __DIR__.'/../app/Modules/Catalog/routes/api.php';
    require __DIR__.'/../app/Modules/MasterData/routes/api.php';
    require __DIR__.'/../app/Modules/Inventory/routes/api.php';
    require __DIR__.'/../app/Modules/Procurement/routes/api.php';
    require __DIR__.'/../app/Modules/Sales/routes/api.php';
    require __DIR__.'/../app/Modules/Accounting/routes/api.php';
});
