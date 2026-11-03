<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table): void {
            $table->boolean('allow_custom_pricing')->default(false)->after('timezone');
            $table->decimal('max_discount_percentage', 5, 2)->default(20.00)->after('allow_custom_pricing');
            $table->decimal('default_tax_rate', 5, 2)->default(0.00)->after('max_discount_percentage');
        });
    }

    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table): void {
            $table->dropColumn([
                'allow_custom_pricing',
                'max_discount_percentage',
                'default_tax_rate',
            ]);
        });
    }
};
