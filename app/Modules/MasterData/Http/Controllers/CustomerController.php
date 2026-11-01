<?php

namespace App\Modules\MasterData\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Foundation\Models\Tenant;
use App\Modules\MasterData\Http\Requests\StoreCustomerRequest;
use App\Modules\MasterData\Http\Requests\UpdateCustomerRequest;
use App\Modules\MasterData\Http\Resources\CustomerResource;
use App\Modules\MasterData\Models\Customer;
use Dedoc\Scramble\Attributes\HeaderParameter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class CustomerController extends Controller
{
    #[HeaderParameter('X-Tenant-ID', 'Selected pharmacy workspace ID.', true, type: 'integer')]
    public function index(Request $request): AnonymousResourceCollection
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');
        $query = Customer::query()->where('tenant_id', $tenant->id);

        if ($search = $request->string('search')->trim()->toString()) {
            $query->where(function ($q) use ($search): void {
                $q->where('name', 'like', '%'.$search.'%')
                    ->orWhere('phone', 'like', '%'.$search.'%')
                    ->orWhere('email', 'like', '%'.$search.'%')
                    ->orWhere('loyalty_code', 'like', '%'.$search.'%');
            });
        }

        return CustomerResource::collection($query->orderBy('name')->paginate(25));
    }

    #[HeaderParameter('X-Tenant-ID', 'Selected pharmacy workspace ID.', true, type: 'integer')]
    public function store(StoreCustomerRequest $request): JsonResponse
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');
        $customer = Customer::query()->create([
            ...$request->validated(),
            'tenant_id' => $tenant->id,
        ]);

        return (new CustomerResource($customer->refresh()))
            ->response()
            ->setStatusCode(201);
    }

    #[HeaderParameter('X-Tenant-ID', 'Selected pharmacy workspace ID.', true, type: 'integer')]
    public function show(Request $request, int $customer): CustomerResource
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');
        $record = Customer::query()->where('tenant_id', $tenant->id)->findOrFail($customer);

        return new CustomerResource($record);
    }

    #[HeaderParameter('X-Tenant-ID', 'Selected pharmacy workspace ID.', true, type: 'integer')]
    public function update(UpdateCustomerRequest $request, int $customer): CustomerResource
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');
        $record = Customer::query()->where('tenant_id', $tenant->id)->findOrFail($customer);
        $record->update($request->validated());

        return new CustomerResource($record->refresh());
    }

    #[HeaderParameter('X-Tenant-ID', 'Selected pharmacy workspace ID.', true, type: 'integer')]
    public function destroy(Request $request, int $customer): Response
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');
        Customer::query()->where('tenant_id', $tenant->id)->findOrFail($customer)->update(['is_active' => false]);

        return response()->noContent();
    }
}
