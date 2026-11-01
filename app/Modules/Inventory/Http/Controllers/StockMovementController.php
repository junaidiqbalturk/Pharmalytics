<?php

namespace App\Modules\Inventory\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Foundation\Models\Tenant;
use App\Modules\Inventory\Http\Resources\StockMovementResource;
use App\Modules\Inventory\Models\StockMovement;
use Dedoc\Scramble\Attributes\HeaderParameter;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class StockMovementController extends Controller
{
    #[HeaderParameter('X-Tenant-ID', 'Selected pharmacy workspace ID.', true, type: 'integer')]
    public function index(Request $request): AnonymousResourceCollection
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');
        $query = StockMovement::query()
            ->with(['medicine', 'batch', 'creator'])
            ->where('tenant_id', $tenant->id);

        if ($medicineId = $request->integer('medicine_id')) {
            $query->where('medicine_id', $medicineId);
        }

        if ($type = $request->string('type')->trim()->toString()) {
            $query->where('type', $type);
        }

        return StockMovementResource::collection(
            $query->orderBy('id', 'desc')->paginate(25),
        );
    }
}
