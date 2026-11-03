<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/health-check', function () {
    try {
        \Illuminate\Support\Facades\DB::connection()->getPdo();
        \Illuminate\Support\Facades\Cache::put('health_test', 'ok', 5);

        return response()->json([
            'status' => 'ok',
        ], 200);
    } catch (\Throwable) {
        return response()->json([
            'status' => 'degraded',
        ], 503);
    }
});
