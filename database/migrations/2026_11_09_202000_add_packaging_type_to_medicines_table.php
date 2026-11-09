<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('medicines', function (Blueprint $table): void {
            $table->string('packaging_type', 50)->default('blister')->after('dosage_form');
            $table->boolean('is_divisible')->default(true)->after('packaging_type');
            $table->string('package_label', 50)->nullable()->after('is_divisible');
        });
    }

    public function down(): void
    {
        Schema::table('medicines', function (Blueprint $table): void {
            $table->dropColumn(['packaging_type', 'is_divisible', 'package_label']);
        });
    }
};
