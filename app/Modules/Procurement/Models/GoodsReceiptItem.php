<?php

namespace App\Modules\Procurement\Models;

use App\Modules\Catalog\Models\Medicine;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GoodsReceiptItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'goods_receipt_id',
        'medicine_id',
        'batch_number',
        'expiry_date',
        'quantity_received',
        'unit_cost',
        'selling_price',
        'subtotal',
    ];

    protected $casts = [
        'expiry_date' => 'date',
        'quantity_received' => 'decimal:3',
        'unit_cost' => 'decimal:2',
        'selling_price' => 'decimal:2',
        'subtotal' => 'decimal:2',
    ];

    /**
     * @return BelongsTo<GoodsReceipt, $this>
     */
    public function goodsReceipt(): BelongsTo
    {
        return $this->belongsTo(GoodsReceipt::class);
    }

    /**
     * @return BelongsTo<Medicine, $this>
     */
    public function medicine(): BelongsTo
    {
        return $this->belongsTo(Medicine::class);
    }
}
