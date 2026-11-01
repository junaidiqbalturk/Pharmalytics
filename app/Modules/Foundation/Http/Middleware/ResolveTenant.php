<?php

namespace App\Modules\Foundation\Http\Middleware;

use App\Modules\Foundation\Models\Tenant;
use Closure;
use Illuminate\Http\Request;
use Spatie\Permission\PermissionRegistrar;
use Symfony\Component\HttpFoundation\Response;

class ResolveTenant
{
    public function handle(Request $request, Closure $next): Response
    {
        $tenantId = $request->integer('tenant_id') ?: (int) $request->header('X-Tenant-ID');

        if ($tenantId < 1 || ! $request->user()?->tenants()->whereKey($tenantId)->exists()) {
            abort(404);
        }

        $tenant = Tenant::query()->findOrFail($tenantId);
        $request->attributes->set('tenant', $tenant);
        app(PermissionRegistrar::class)->setPermissionsTeamId($tenant->getKey());

        return $next($request);
    }
}
