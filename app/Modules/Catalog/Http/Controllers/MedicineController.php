<?php

namespace App\Modules\Catalog\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Catalog\Http\Requests\StoreMedicineRequest;
use App\Modules\Catalog\Http\Requests\UpdateMedicineRequest;
use App\Modules\Catalog\Http\Resources\MedicineResource;
use App\Modules\Foundation\Models\Tenant;
use Dedoc\Scramble\Attributes\HeaderParameter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class MedicineController extends Controller
{
    #[HeaderParameter('X-Tenant-ID', 'Selected pharmacy workspace ID.', true, type: 'integer')]
    public function index(Request $request): AnonymousResourceCollection
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');
        $query = $tenant->medicines()->with('category');

        if ($search = $request->string('search')->trim()->toString()) {
            $query->where(function ($query) use ($search): void {
                $query->where('name', 'ilike', '%'.$search.'%')
                    ->orWhere('generic_name', 'ilike', '%'.$search.'%')
                    ->orWhere('sku', 'ilike', '%'.$search.'%')
                    ->orWhere('barcode', 'ilike', '%'.$search.'%');
            });
        }

        return MedicineResource::collection($query->orderBy('name')->orderBy('id')->paginate(25));
    }

    #[HeaderParameter('X-Tenant-ID', 'Selected pharmacy workspace ID.', true, type: 'integer')]
    public function store(StoreMedicineRequest $request): JsonResponse
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');
        $data = $request->validated();
        $user = $request->user();

        $medicine = \Illuminate\Support\Facades\DB::transaction(function () use ($tenant, $data, $user) {
            $medicine = $tenant->medicines()->create($data);

            $initialStock = (float) ($data['initial_stock'] ?? 0);
            if ($initialStock > 0) {
                $batchNumber = !empty($data['batch_number']) ? $data['batch_number'] : 'INIT-'.strtoupper(\Illuminate\Support\Str::random(6));
                $expiryDate = !empty($data['expiry_date']) ? $data['expiry_date'] : now()->addYears(2)->toDateString();

                $batch = \App\Modules\Inventory\Models\Batch::query()->create([
                    'tenant_id' => $tenant->id,
                    'medicine_id' => $medicine->id,
                    'batch_number' => $batchNumber,
                    'expiry_date' => $expiryDate,
                    'cost_price' => $data['cost_price'] ?? 0,
                    'selling_price' => $data['selling_price'] ?? 0,
                    'quantity' => $initialStock,
                    'is_active' => true,
                ]);

                \App\Modules\Inventory\Models\StockMovement::query()->create([
                    'tenant_id' => $tenant->id,
                    'medicine_id' => $medicine->id,
                    'batch_id' => $batch->id,
                    'type' => 'opening_stock',
                    'quantity' => $initialStock,
                    'balance_after' => $initialStock,
                    'reference_type' => 'Medicine',
                    'reference_id' => $medicine->id,
                    'notes' => 'Opening inventory balance',
                    'created_by' => $user?->id,
                ]);
            }

            return $medicine;
        });

        return (new MedicineResource($medicine->refresh()->load('category')))
            ->response()
            ->setStatusCode(201);
    }

    #[HeaderParameter('X-Tenant-ID', 'Selected pharmacy workspace ID.', true, type: 'integer')]
    public function show(Request $request, int $medicine): MedicineResource
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');

        return new MedicineResource($tenant->medicines()->with('category')->findOrFail($medicine));
    }

    #[HeaderParameter('X-Tenant-ID', 'Selected pharmacy workspace ID.', true, type: 'integer')]
    public function update(UpdateMedicineRequest $request, int $medicine): MedicineResource
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');
        $record = $tenant->medicines()->findOrFail($medicine);
        $record->update($request->validated());

        return new MedicineResource($record->refresh()->load('category'));
    }

    #[HeaderParameter('X-Tenant-ID', 'Selected pharmacy workspace ID.', true, type: 'integer')]
    public function destroy(Request $request, int $medicine): Response
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');
        $tenant->medicines()->findOrFail($medicine)->update(['is_active' => false]);

        return response()->noContent();
    }

    #[HeaderParameter('X-Tenant-ID', 'Selected pharmacy workspace ID.', true, type: 'integer')]
    public function downloadImportTemplate(\App\Modules\Catalog\Services\MedicineBulkImportService $importService): Response
    {
        $csv = $importService->generateTemplateCsv();

        return response($csv, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="pharmalytics_inventory_template.csv"',
        ]);
    }

    #[HeaderParameter('X-Tenant-ID', 'Selected pharmacy workspace ID.', true, type: 'integer')]
    public function import(Request $request, \App\Modules\Catalog\Services\MedicineBulkImportService $importService): JsonResponse
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');
        $user = $request->user();

        $request->validate([
            'file' => ['required', 'file', 'max:10240'], // 10MB max
        ]);

        $file = $request->file('file');
        if (! $file || ! $file->isValid()) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid file upload.',
            ], 422);
        }

        $extension = strtolower($file->getClientOriginalExtension());
        if (! in_array($extension, ['csv', 'txt'], true)) {
            return response()->json([
                'success' => false,
                'message' => "Unsupported file type. Please upload a standard CSV file (.csv). Excel users can save as 'CSV (Comma delimited)' before uploading.",
            ], 422);
        }

        $result = $importService->import($tenant, $file->getRealPath(), $user);

        $status = $result['summary']['created_medicines'] > 0 || $result['summary']['updated_medicines'] > 0 ? 200 : 422;

        return response()->json($result, $status);
    }
}
