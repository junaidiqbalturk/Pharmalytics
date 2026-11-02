<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/health-check', function () {
    $results = [];

    $results['app_key_set'] = ! empty(config('app.key'));
    $results['session_driver'] = config('session.driver');
    $results['cache_store'] = config('cache.default');

    try {
        \Illuminate\Support\Facades\DB::connection()->getPdo();
        $results['database'] = 'Connected successfully';
        $results['tables'] = \Illuminate\Support\Facades\Schema::getTableListing();
    } catch (\Throwable $e) {
        $results['database'] = 'Failed: '.$e->getMessage();
    }

    try {
        \Illuminate\Support\Facades\Cache::put('health_test', 'ok', 10);
        $results['cache'] = 'OK';
    } catch (\Throwable $e) {
        $results['cache'] = 'Failed: '.$e->getMessage();
    }

    return response()->json($results);
});
