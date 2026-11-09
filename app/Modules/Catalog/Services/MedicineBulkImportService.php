<?php

namespace App\Modules\Catalog\Services;

use App\Models\User;
use App\Modules\Catalog\Models\Medicine;
use App\Modules\Foundation\Models\MedicineCategory;
use App\Modules\Foundation\Models\Tenant;
use App\Modules\Inventory\Models\Batch;
use App\Modules\Inventory\Models\StockMovement;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class MedicineBulkImportService
{
    /**
     * Generate standard CSV template with headers and sample rows.
     */
    public function generateTemplateCsv(): string
    {
        $headers = [
            'category',
            'name',
            'generic_name',
            'sku',
            'barcode',
            'strength',
            'dosage_form',
            'packaging_type',
            'is_divisible',
            'package_label',
            'tablets_per_strip',
            'strips_per_box',
            'cost_price',
            'selling_price',
            'reorder_level',
            'batch_number',
            'expiry_date',
            'opening_stock',
        ];

        $sampleRows = [
            [
                'Analgesics',
                'Panadol 500mg Tablets',
                'Paracetamol',
                'PAN-TAB-500',
                '8964000100011',
                '500mg',
                'Tablet',
                'blister',
                'yes',
                'Strip',
                '10',
                '20',
                '30.00',
                '40.00',
                '10',
                'B-PAN-01',
                now()->addYear()->format('Y-m-d'),
                '50',
            ],
            [
                'Antibiotics',
                'Augmentin 156.25mg/5ml Syrup',
                'Amoxicillin + Clavulanic Acid',
                'AUG-SYR-156',
                '8964000200022',
                '156.25mg/5ml',
                'Syrup',
                'bottle',
                'no',
                'Bottle',
                '1',
                '1',
                '185.00',
                '220.00',
                '5',
                'B-AUG-01',
                now()->addMonths(18)->format('Y-m-d'),
                '25',
            ],
            [
                'Dermatology',
                'Betnovate-N Cream 20g',
                'Betamethasone + Neomycin',
                'BET-CRM-020',
                '8964000300033',
                '20g',
                'Cream',
                'tube',
                'no',
                'Tube',
                '1',
                '1',
                '95.00',
                '125.00',
                '5',
                'B-BET-01',
                now()->addMonths(14)->format('Y-m-d'),
                '15',
            ],
        ];

        $fp = fopen('php://temp', 'r+');
        fputcsv($fp, $headers);
        foreach ($sampleRows as $row) {
            fputcsv($fp, $row);
        }
        rewind($fp);
        $csv = stream_get_contents($fp);
        fclose($fp);

        return (string) $csv;
    }

    /**
     * Import medicines from a CSV file path or stream.
     *
     * @return array{
     *     success: bool,
     *     summary: array{
     *         total_rows: int,
     *         created_medicines: int,
     *         updated_medicines: int,
     *         created_batches: int,
     *         failed_rows: int
     *     },
     *     errors: array<int, array{row: int, medicine: string, message: string}>
     * }
     */
    public function import(Tenant $tenant, string $filePath, ?User $user = null): array
    {
        $handle = fopen($filePath, 'r');
        if (! $handle) {
            throw new \RuntimeException('Failed to open uploaded inventory file.');
        }

        // Strip UTF-8 BOM if present
        $bom = fread($handle, 3);
        if ($bom !== "\xEF\xBB\xBF") {
            rewind($handle);
        }

        $headerLine = fgetcsv($handle);
        if (! $headerLine) {
            fclose($handle);
            throw new \RuntimeException('Uploaded inventory file is empty.');
        }

        $columnMap = $this->buildColumnMap($headerLine);

        $totalRows = 0;
        $createdMedicines = 0;
        $updatedMedicines = 0;
        $createdBatches = 0;
        $errors = [];

        $rowIndex = 1; // 1-based, header was line 1

        while (($row = fgetcsv($handle)) !== false) {
            $rowIndex++;

            // Ignore empty rows
            if (empty(array_filter($row, fn ($val) => trim((string) $val) !== ''))) {
                continue;
            }

            $totalRows++;
            $data = $this->mapRow($columnMap, $row);

            $name = trim($data['name'] ?? '');
            if ($name === '') {
                $errors[] = [
                    'row' => $rowIndex,
                    'medicine' => 'Unknown',
                    'message' => 'Medicine name is required.',
                ];
                continue;
            }

            $rawSellingPrice = $data['selling_price'] ?? null;
            if ($rawSellingPrice === null || ! is_numeric($rawSellingPrice) || (float) $rawSellingPrice < 0) {
                $errors[] = [
                    'row' => $rowIndex,
                    'medicine' => $name,
                    'message' => "Invalid selling price '{$rawSellingPrice}'. Must be a non-negative number.",
                ];
                continue;
            }
            $sellingPrice = (float) $rawSellingPrice;

            $costPrice = isset($data['cost_price']) && is_numeric($data['cost_price'])
                ? max(0, (float) $data['cost_price'])
                : 0.0;

            try {
                DB::transaction(function () use (
                    $tenant,
                    $user,
                    $data,
                    $name,
                    $sellingPrice,
                    $costPrice,
                    &$createdMedicines,
                    &$updatedMedicines,
                    &$createdBatches
                ): void {
                    // 1. Resolve Category
                    $categoryId = null;
                    $categoryName = trim($data['category'] ?? '');
                    if ($categoryName !== '') {
                        $categorySlug = Str::slug($categoryName);
                        $category = MedicineCategory::query()->firstOrCreate(
                            [
                                'tenant_id' => $tenant->id,
                                'slug' => $categorySlug,
                            ],
                            [
                                'name' => $categoryName,
                                'is_active' => true,
                            ]
                        );
                        $categoryId = $category->id;
                    }

                    // 2. Resolve Dosage Form & Packaging Type
                    $dosageForm = trim($data['dosage_form'] ?? 'Tablet');
                    $packagingType = trim($data['packaging_type'] ?? '');
                    $isDivisible = null;

                    if (isset($data['is_divisible']) && $data['is_divisible'] !== '') {
                        $divStr = strtolower(trim((string) $data['is_divisible']));
                        $isDivisible = in_array($divStr, ['yes', 'true', '1', 'y'], true);
                    }

                    if ($packagingType === '') {
                        $dosageLower = strtolower($dosageForm);
                        if (Str::contains($dosageLower, ['syrup', 'suspension', 'drop', 'solution', 'elixir'])) {
                            $packagingType = 'bottle';
                            $isDivisible = $isDivisible ?? false;
                        } elseif (Str::contains($dosageLower, ['cream', 'ointment', 'gel', 'paste'])) {
                            $packagingType = 'tube';
                            $isDivisible = $isDivisible ?? false;
                        } elseif (Str::contains($dosageLower, ['injection', 'vial', 'ampoule', 'infusion'])) {
                            $packagingType = 'vial';
                            $isDivisible = $isDivisible ?? false;
                        } elseif (Str::contains($dosageLower, ['inhaler', 'spray', 'aerosol'])) {
                            $packagingType = 'inhaler';
                            $isDivisible = $isDivisible ?? false;
                        } elseif (Str::contains($dosageLower, ['sachet', 'powder', 'granule'])) {
                            $packagingType = 'sachet';
                            $isDivisible = $isDivisible ?? false;
                        } else {
                            $packagingType = 'blister';
                            $isDivisible = $isDivisible ?? true;
                        }
                    } else {
                        $isDivisible = $isDivisible ?? ($packagingType === 'blister');
                    }

                    $packageLabel = trim($data['package_label'] ?? '');
                    if ($packageLabel === '') {
                        $packageLabel = ucfirst($packagingType);
                    }

                    $tabletsPerStrip = isset($data['tablets_per_strip']) && is_numeric($data['tablets_per_strip'])
                        ? max(1, (int) $data['tablets_per_strip'])
                        : 10;

                    $stripsPerBox = isset($data['strips_per_box']) && is_numeric($data['strips_per_box'])
                        ? max(1, (int) $data['strips_per_box'])
                        : 10;

                    // 3. Resolve SKU
                    $sku = trim($data['sku'] ?? '');
                    if ($sku === '') {
                        $sku = strtoupper(Str::slug(substr($name, 0, 8))).'-'.strtoupper(Str::random(4));
                    }

                    // 4. Create or Update Medicine
                    $medicine = Medicine::query()
                        ->where('tenant_id', $tenant->id)
                        ->where('sku', $sku)
                        ->first();

                    $medicineAttributes = [
                        'tenant_id' => $tenant->id,
                        'medicine_category_id' => $categoryId,
                        'name' => $name,
                        'generic_name' => trim($data['generic_name'] ?? '') ?: null,
                        'sku' => $sku,
                        'barcode' => trim($data['barcode'] ?? '') ?: null,
                        'strength' => trim($data['strength'] ?? '') ?: null,
                        'dosage_form' => $dosageForm ?: null,
                        'packaging_type' => $packagingType,
                        'is_divisible' => $isDivisible,
                        'package_label' => $packageLabel,
                        'tablets_per_strip' => $tabletsPerStrip,
                        'strips_per_box' => $stripsPerBox,
                        'reorder_level' => isset($data['reorder_level']) && is_numeric($data['reorder_level']) ? (float) $data['reorder_level'] : 10,
                        'cost_price' => $costPrice,
                        'selling_price' => $sellingPrice,
                        'price_per_strip' => $sellingPrice,
                        'price_per_unit' => $isDivisible ? round($sellingPrice / $tabletsPerStrip, 2) : $sellingPrice,
                        'price_per_box' => $isDivisible ? round($sellingPrice * $stripsPerBox, 2) : $sellingPrice,
                        'is_active' => true,
                    ];

                    if ($medicine) {
                        $medicine->update($medicineAttributes);
                        $updatedMedicines++;
                    } else {
                        $medicine = Medicine::query()->create($medicineAttributes);
                        $createdMedicines++;
                    }

                    // 5. Create Opening Stock Batch if specified
                    $rawOpeningStock = $data['opening_stock'] ?? 0;
                    $openingStock = is_numeric($rawOpeningStock) ? (float) $rawOpeningStock : 0.0;

                    if ($openingStock > 0) {
                        $batchNumber = trim($data['batch_number'] ?? '');
                        if ($batchNumber === '') {
                            $batchNumber = 'INIT-'.strtoupper(Str::random(6));
                        }

                        $expiryDate = $this->parseExpiryDate($data['expiry_date'] ?? null);

                        $batch = Batch::query()->create([
                            'tenant_id' => $tenant->id,
                            'medicine_id' => $medicine->id,
                            'batch_number' => $batchNumber,
                            'expiry_date' => $expiryDate,
                            'cost_price' => $costPrice,
                            'selling_price' => $sellingPrice,
                            'quantity' => $openingStock,
                            'is_active' => true,
                        ]);

                        StockMovement::query()->create([
                            'tenant_id' => $tenant->id,
                            'medicine_id' => $medicine->id,
                            'batch_id' => $batch->id,
                            'type' => 'opening_stock',
                            'quantity' => $openingStock,
                            'balance_after' => $openingStock,
                            'reference_type' => 'Medicine',
                            'reference_id' => $medicine->id,
                            'notes' => 'Bulk Excel onboarding opening stock',
                            'created_by' => $user?->id,
                        ]);

                        $createdBatches++;
                    }
                });
            } catch (\Throwable $e) {
                $errors[] = [
                    'row' => $rowIndex,
                    'medicine' => $name,
                    'message' => $e->getMessage(),
                ];
            }
        }

        fclose($handle);

        return [
            'success' => count($errors) === 0,
            'summary' => [
                'total_rows' => $totalRows,
                'created_medicines' => $createdMedicines,
                'updated_medicines' => $updatedMedicines,
                'created_batches' => $createdBatches,
                'failed_rows' => count($errors),
            ],
            'errors' => $errors,
        ];
    }

    /**
     * Build mapping from CSV column header index to canonical key.
     *
     * @param  array<int, string>  $headers
     * @return array<int, string>
     */
    private function buildColumnMap(array $headers): array
    {
        $synonyms = [
            'category' => 'category',
            'category_name' => 'category',
            'categories' => 'category',

            'name' => 'name',
            'medicine_name' => 'name',
            'brand_name' => 'name',
            'item_name' => 'name',
            'product_name' => 'name',

            'generic_name' => 'generic_name',
            'generic' => 'generic_name',
            'formula' => 'generic_name',

            'sku' => 'sku',
            'code' => 'sku',
            'item_code' => 'sku',

            'barcode' => 'barcode',
            'upc' => 'barcode',
            'ean' => 'barcode',

            'strength' => 'strength',
            'potency' => 'strength',
            'dosage' => 'strength',

            'dosage_form' => 'dosage_form',
            'form' => 'dosage_form',
            'type' => 'dosage_form',

            'packaging_type' => 'packaging_type',
            'package_type' => 'packaging_type',
            'packaging' => 'packaging_type',

            'is_divisible' => 'is_divisible',
            'divisible' => 'is_divisible',

            'package_label' => 'package_label',
            'pack_label' => 'package_label',
            'unit_label' => 'package_label',

            'tablets_per_strip' => 'tablets_per_strip',
            'tabs_per_strip' => 'tablets_per_strip',
            'tablets_per_patta' => 'tablets_per_strip',
            'units_per_strip' => 'tablets_per_strip',

            'strips_per_box' => 'strips_per_box',
            'pattay_per_dabba' => 'strips_per_box',
            'strips_per_pack' => 'strips_per_box',

            'cost_price' => 'cost_price',
            'purchase_price' => 'cost_price',
            'buy_price' => 'cost_price',
            'tp' => 'cost_price',
            'trade_price' => 'cost_price',

            'selling_price' => 'selling_price',
            'retail_price' => 'selling_price',
            'mrp' => 'selling_price',
            'price' => 'selling_price',

            'reorder_level' => 'reorder_level',
            'alert_level' => 'reorder_level',
            'min_stock' => 'reorder_level',

            'batch_number' => 'batch_number',
            'batch' => 'batch_number',
            'batch_no' => 'batch_number',
            'lot' => 'batch_number',
            'lot_number' => 'batch_number',

            'expiry_date' => 'expiry_date',
            'expiry' => 'expiry_date',
            'exp_date' => 'expiry_date',
            'exp' => 'expiry_date',

            'opening_stock' => 'opening_stock',
            'initial_stock' => 'opening_stock',
            'stock' => 'opening_stock',
            'quantity' => 'opening_stock',
            'qty' => 'opening_stock',
        ];

        $map = [];
        foreach ($headers as $index => $rawHeader) {
            $cleaned = strtolower(trim(str_replace([' ', '-', '.'], '_', (string) $rawHeader)));
            if (isset($synonyms[$cleaned])) {
                $map[$index] = $synonyms[$cleaned];
            }
        }

        return $map;
    }

    /**
     * Map a raw CSV row to an associative array using the column map.
     *
     * @param  array<int, string>  $map
     * @param  array<int, string>  $row
     * @return array<string, string>
     */
    private function mapRow(array $map, array $row): array
    {
        $result = [];
        foreach ($row as $index => $value) {
            if (isset($map[$index])) {
                $result[$map[$index]] = trim((string) $value);
            }
        }

        return $result;
    }

    /**
     * Parse flexible date strings (YYYY-MM-DD, DD/MM/YYYY, etc.) to YYYY-MM-DD.
     */
    private function parseExpiryDate(?string $rawDate): string
    {
        if (empty($rawDate)) {
            return now()->addYears(2)->toDateString();
        }

        $trimmed = trim($rawDate);

        // Try standard Carbon parse
        try {
            return Carbon::parse($trimmed)->toDateString();
        } catch (\Throwable) {
            // Try common slash or dot formats: DD/MM/YYYY or MM/DD/YYYY
            $formats = ['d/m/Y', 'm/d/Y', 'd-m-Y', 'Y/m/d', 'd.m.Y'];
            foreach ($formats as $fmt) {
                try {
                    return Carbon::createFromFormat($fmt, $trimmed)->toDateString();
                } catch (\Throwable) {
                    continue;
                }
            }
        }

        return now()->addYears(2)->toDateString();
    }
}
