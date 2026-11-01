<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('medicines', function (Blueprint $table): void {
            $table->decimal('cost_price', 12, 2)->default(0)->after('reorder_level');
            $table->decimal('selling_price', 12, 2)->default(0)->after('cost_price');
        });
    }

    public function down(): void
    {
        Schema::table('medicines', function (Blueprint $table): void {
            $table->dropColumn(['cost_price', 'selling_price']);
        });
    }
};
