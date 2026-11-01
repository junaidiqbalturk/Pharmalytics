<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('medicines', function (Blueprint $table): void {
            $table->unsignedInteger('tablets_per_strip')->default(10)->after('dosage_form');
            $table->unsignedInteger('strips_per_box')->default(10)->after('tablets_per_strip');
            $table->decimal('price_per_strip', 12, 2)->nullable()->after('selling_price');
            $table->decimal('price_per_unit', 12, 2)->nullable()->after('price_per_strip'); // price per single tablet
            $table->decimal('price_per_box', 12, 2)->nullable()->after('price_per_unit');
        });

        Schema::table('sale_items', function (Blueprint $table): void {
            $table->string('unit_type', 30)->default('unit')->after('quantity'); // strip, unit, box
            $table->decimal('units_multiplier', 12, 3)->default(1)->after('unit_type');
        });
    }

    public function down(): void
    {
        Schema::table('sale_items', function (Blueprint $table): void {
            $table->dropColumn(['unit_type', 'units_multiplier']);
        });

        Schema::table('medicines', function (Blueprint $table): void {
            $table->dropColumn([
                'tablets_per_strip',
                'strips_per_box',
                'price_per_strip',
                'price_per_unit',
                'price_per_box',
            ]);
        });
    }
};
