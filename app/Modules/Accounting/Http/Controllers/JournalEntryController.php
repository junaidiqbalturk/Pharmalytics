<?php

namespace App\Modules\Accounting\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Accounting\Http\Requests\StoreJournalEntryRequest;
use App\Modules\Accounting\Http\Resources\JournalEntryResource;
use App\Modules\Accounting\Models\JournalEntry;
use App\Modules\Accounting\Models\JournalEntryItem;
use App\Modules\Foundation\Models\Tenant;
use Dedoc\Scramble\Attributes\HeaderParameter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class JournalEntryController extends Controller
{
    #[HeaderParameter('X-Tenant-ID', 'Selected pharmacy workspace ID.', true, type: 'integer')]
    public function index(Request $request): AnonymousResourceCollection
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');
        $query = JournalEntry::query()
            ->with(['items.account', 'creator'])
            ->where('tenant_id', $tenant->id);

        return JournalEntryResource::collection(
            $query->orderBy('id', 'desc')->paginate(25),
        );
    }

    #[HeaderParameter('X-Tenant-ID', 'Selected pharmacy workspace ID.', true, type: 'integer')]
    public function store(StoreJournalEntryRequest $request): JsonResponse
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');
        $user = $request->user();
        $data = $request->validated();

        $entry = DB::transaction(function () use ($tenant, $user, $data): JournalEntry {
            $entryNumber = 'JE-'.strtoupper(Str::random(8));

            $journalEntry = JournalEntry::query()->create([
                'tenant_id' => $tenant->id,
                'entry_number' => $entryNumber,
                'date' => $data['date'],
                'description' => $data['description'],
                'reference_type' => $data['reference_type'] ?? null,
                'reference_id' => $data['reference_id'] ?? null,
                'status' => 'posted',
                'created_by' => $user?->id,
            ]);

            foreach ($data['items'] as $item) {
                $journalEntry->items()->create([
                    'chart_of_account_id' => $item['chart_of_account_id'],
                    'type' => $item['type'],
                    'amount' => $item['amount'],
                    'description' => $item['description'] ?? null,
                ]);
            }

            return $journalEntry;
        });

        return (new JournalEntryResource($entry->load(['items.account', 'creator'])))
            ->response()
            ->setStatusCode(201);
    }

    #[HeaderParameter('X-Tenant-ID', 'Selected pharmacy workspace ID.', true, type: 'integer')]
    public function show(Request $request, int $journalEntry): JournalEntryResource
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');
        $record = JournalEntry::query()
            ->with(['items.account', 'creator'])
            ->where('tenant_id', $tenant->id)
            ->findOrFail($journalEntry);

        return new JournalEntryResource($record);
    }

    #[HeaderParameter('X-Tenant-ID', 'Selected pharmacy workspace ID.', true, type: 'integer')]
    public function ledger(Request $request, int $chartOfAccountId): JsonResponse
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');

        $items = JournalEntryItem::query()
            ->with('journalEntry')
            ->where('chart_of_account_id', $chartOfAccountId)
            ->whereHas('journalEntry', fn ($q) => $q->where('tenant_id', $tenant->id))
            ->orderBy('id', 'asc')
            ->get();

        $balance = 0;
        $ledgerRows = $items->map(function ($item) use (&$balance) {
            $debit = $item->type === 'debit' ? (float) $item->amount : 0;
            $credit = $item->type === 'credit' ? (float) $item->amount : 0;
            $balance += ($debit - $credit);

            return [
                'id' => $item->id,
                'entry_number' => $item->journalEntry?->entry_number,
                'date' => $item->journalEntry?->date?->format('Y-m-d'),
                'description' => $item->description ?: $item->journalEntry?->description,
                'debit' => $debit > 0 ? (string) $debit : null,
                'credit' => $credit > 0 ? (string) $credit : null,
                'running_balance' => (string) round($balance, 2),
            ];
        });

        return response()->json([
            'data' => [
                'account_id' => $chartOfAccountId,
                'final_balance' => (string) round($balance, 2),
                'transactions' => $ledgerRows,
            ],
        ]);
    }
}
