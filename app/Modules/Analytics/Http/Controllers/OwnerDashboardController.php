<?php

namespace App\Modules\Analytics\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Analytics\Services\OwnerAnalyticsService;
use App\Modules\Foundation\Models\Tenant;
use Dedoc\Scramble\Attributes\HeaderParameter;
use Dedoc\Scramble\Attributes\QueryParameter;
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
     * Module 2: Sales Intelligence & Summary
     */
    #[HeaderParameter('X-Tenant-ID', 'Selected pharmacy workspace ID.', true, type: 'integer')]
    #[QueryParameter('period', 'Filter period: today, yesterday, this_week, this_month, last_month, this_year, custom', false, type: 'string')]
    #[QueryParameter('start_date', 'Custom start date (YYYY-MM-DD)', false, type: 'string')]
    #[QueryParameter('end_date', 'Custom end date (YYYY-MM-DD)', false, type: 'string')]
    public function salesSummary(Request $request): JsonResponse
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');
        $this->ensureOwnerAccess($request, $tenant);

        $period = $request->string('period')->trim()->toString() ?: null;
        $startDate = $request->string('start_date')->trim()->toString() ?: null;
        $endDate = $request->string('end_date')->trim()->toString() ?: null;

        $data = $this->analyticsService->getSalesSummary($tenant, $period, $startDate, $endDate);

        return response()->json([
            'data' => $data,
        ]);
    }

    /**
     * Module 3: Inventory Intelligence & Summary
     */
    #[HeaderParameter('X-Tenant-ID', 'Selected pharmacy workspace ID.', true, type: 'integer')]
    public function inventorySummary(Request $request): JsonResponse
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');
        $this->ensureOwnerAccess($request, $tenant);

        $data = $this->analyticsService->getInventorySummary($tenant);

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
