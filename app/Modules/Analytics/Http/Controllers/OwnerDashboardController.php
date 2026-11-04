<?php

namespace App\Modules\Analytics\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Analytics\Services\OwnerAnalyticsService;
use App\Modules\Foundation\Models\Tenant;
use Dedoc\Scramble\Attributes\HeaderParameter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OwnerDashboardController extends Controller
{
    public function __construct(
        protected OwnerAnalyticsService $analyticsService
    ) {}

    /**
     * Module 1: Owner Executive Dashboard
     */
    #[HeaderParameter('X-Tenant-ID', 'Selected pharmacy workspace ID.', true, type: 'integer')]
    public function dashboard(Request $request): JsonResponse
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');
        $this->ensureOwnerAccess($request, $tenant);

        $data = $this->analyticsService->getDashboard($tenant);

        return response()->json([
            'data' => $data,
        ]);
    }

    /**
     * Enforce owner authorization boundary.
     */
    protected function ensureOwnerAccess(Request $request, Tenant $tenant): void
    {
        $user = $request->user();

        if (! $user) {
            abort(401, 'Unauthenticated.');
        }

        app(\Spatie\Permission\PermissionRegistrar::class)->setPermissionsTeamId($tenant->id);

        if (! $user->hasRole(['owner', 'admin'])) {
            abort(403, 'Unauthorized. Owner access required for business intelligence.');
        }
    }
}
