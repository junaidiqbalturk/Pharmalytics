<?php

namespace App\Modules\Accounting\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Accounting\Http\Requests\StoreChartOfAccountRequest;
use App\Modules\Accounting\Http\Requests\UpdateChartOfAccountRequest;
use App\Modules\Accounting\Http\Resources\ChartOfAccountResource;
use App\Modules\Accounting\Models\ChartOfAccount;
use App\Modules\Foundation\Models\Tenant;
use Dedoc\Scramble\Attributes\HeaderParameter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class ChartOfAccountController extends Controller
{
    #[HeaderParameter('X-Tenant-ID', 'Selected pharmacy workspace ID.', true, type: 'integer')]
    public function index(Request $request): AnonymousResourceCollection
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');
        $query = ChartOfAccount::query()->where('tenant_id', $tenant->id);

        if ($type = $request->string('type')->trim()->toString()) {
            $query->where('type', $type);
        }

        if ($search = $request->string('search')->trim()->toString()) {
            $query->where(function ($q) use ($search): void {
                $q->where('name', 'like', '%'.$search.'%')
                    ->orWhere('code', 'like', '%'.$search.'%');
            });
        }

        return ChartOfAccountResource::collection(
            $query->orderBy('code', 'asc')->paginate(50),
        );
    }

    #[HeaderParameter('X-Tenant-ID', 'Selected pharmacy workspace ID.', true, type: 'integer')]
    public function store(StoreChartOfAccountRequest $request): JsonResponse
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');
        $account = ChartOfAccount::query()->create([
            ...$request->validated(),
            'tenant_id' => $tenant->id,
        ]);

        return (new ChartOfAccountResource($account->refresh()))
            ->response()
            ->setStatusCode(201);
    }

    #[HeaderParameter('X-Tenant-ID', 'Selected pharmacy workspace ID.', true, type: 'integer')]
    public function show(Request $request, int $chartOfAccount): ChartOfAccountResource
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');
        $record = ChartOfAccount::query()
            ->where('tenant_id', $tenant->id)
            ->findOrFail($chartOfAccount);

        return new ChartOfAccountResource($record);
    }

    #[HeaderParameter('X-Tenant-ID', 'Selected pharmacy workspace ID.', true, type: 'integer')]
    public function update(UpdateChartOfAccountRequest $request, int $chartOfAccount): ChartOfAccountResource
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');
        $record = ChartOfAccount::query()
            ->where('tenant_id', $tenant->id)
            ->findOrFail($chartOfAccount);

        $record->update($request->validated());

        return new ChartOfAccountResource($record->refresh());
    }

    #[HeaderParameter('X-Tenant-ID', 'Selected pharmacy workspace ID.', true, type: 'integer')]
    public function destroy(Request $request, int $chartOfAccount): Response
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');
        $record = ChartOfAccount::query()
            ->where('tenant_id', $tenant->id)
            ->findOrFail($chartOfAccount);

        if ($record->is_system) {
            abort(422, 'System core accounts cannot be deactivated or deleted.');
        }

        $record->update(['is_active' => false]);

        return response()->noContent();
    }
}
