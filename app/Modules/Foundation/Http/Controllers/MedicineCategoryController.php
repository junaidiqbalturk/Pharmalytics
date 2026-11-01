<?php

namespace App\Modules\Foundation\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Foundation\Http\Requests\StoreMedicineCategoryRequest;
use App\Modules\Foundation\Http\Requests\UpdateMedicineCategoryRequest;
use App\Modules\Foundation\Http\Resources\MedicineCategoryResource;
use App\Modules\Foundation\Models\Tenant;
use Dedoc\Scramble\Attributes\HeaderParameter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class MedicineCategoryController extends Controller
{
    #[HeaderParameter('X-Tenant-ID', 'Selected pharmacy workspace ID.', true, type: 'integer')]
    public function index(Request $request): AnonymousResourceCollection
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');

        return MedicineCategoryResource::collection(
            $tenant->medicineCategories()->orderBy('name')->orderBy('id')->paginate(25),
        );
    }

    #[HeaderParameter('X-Tenant-ID', 'Selected pharmacy workspace ID.', true, type: 'integer')]
    public function store(StoreMedicineCategoryRequest $request): JsonResponse
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');
        $data = $request->validated();
        $data['tenant_id'] = $tenant->getKey();

        return (new MedicineCategoryResource($tenant->medicineCategories()->create($data)->refresh()))
            ->response()
            ->setStatusCode(201);
    }

    #[HeaderParameter('X-Tenant-ID', 'Selected pharmacy workspace ID.', true, type: 'integer')]
    public function update(UpdateMedicineCategoryRequest $request, int $category): MedicineCategoryResource
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');
        $medicineCategory = $tenant->medicineCategories()->findOrFail($category);
        $data = $request->validated();
        $medicineCategory->update($data);

        return new MedicineCategoryResource($medicineCategory->refresh());
    }

    #[HeaderParameter('X-Tenant-ID', 'Selected pharmacy workspace ID.', true, type: 'integer')]
    public function destroy(Request $request, int $category): Response
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');
        $tenant->medicineCategories()->findOrFail($category)->update(['is_active' => false]);

        return response()->noContent();
    }
}
