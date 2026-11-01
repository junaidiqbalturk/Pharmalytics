<?php

namespace App\Modules\Accounting\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreJournalEntryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'date' => ['required', 'date'],
            'description' => ['required', 'string', 'max:255'],
            'reference_type' => ['nullable', 'string', 'max:80'],
            'reference_id' => ['nullable', 'integer'],
            'items' => ['required', 'array', 'min:2'],
            'items.*.chart_of_account_id' => ['required', 'integer', 'exists:chart_of_accounts,id'],
            'items.*.type' => ['required', 'in:debit,credit'],
            'items.*.amount' => ['required', 'numeric', 'min:0.01'],
            'items.*.description' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $items = $this->input('items', []);
            if (!is_array($items) || count($items) < 2) {
                return;
            }

            $totalDebits = 0;
            $totalCredits = 0;

            foreach ($items as $item) {
                $amount = (float) ($item['amount'] ?? 0);
                if (($item['type'] ?? '') === 'debit') {
                    $totalDebits += $amount;
                } elseif (($item['type'] ?? '') === 'credit') {
                    $totalCredits += $amount;
                }
            }

            if (round($totalDebits, 2) !== round($totalCredits, 2)) {
                $validator->errors()->add('items', 'Journal entry must balance: total debits ('.number_format($totalDebits, 2).') must equal total credits ('.number_format($totalCredits, 2).').');
            }
        });
    }
}
