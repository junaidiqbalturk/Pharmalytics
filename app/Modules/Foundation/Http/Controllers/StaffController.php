<?php

namespace App\Modules\Foundation\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Foundation\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\PermissionRegistrar;

class StaffController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');
        app(PermissionRegistrar::class)->setPermissionsTeamId($tenant->getKey());

        $users = $tenant->users()->orderBy('name')->get()->map(function (User $user) {
            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'roles' => $user->getRoleNames()->values()->all(),
                'created_at' => $user->created_at?->toISOString(),
            ];
        });

        return response()->json(['data' => $users]);
    }

    public function store(Request $request): JsonResponse
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');

        $data = $request->validate([
            'name' => ['required', 'string', 'max:180'],
            'email' => ['required', 'email', 'max:180'],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', 'in:admin,pharmacist,cashier'],
        ]);

        $user = User::query()->where('email', $data['email'])->first();
        if (! $user) {
            $user = User::query()->create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
            ]);
        }

        if (! $tenant->users()->whereKey($user->id)->exists()) {
            $tenant->users()->attach($user, ['is_default' => false]);
        }

        app(PermissionRegistrar::class)->setPermissionsTeamId($tenant->getKey());
        $user->syncRoles([$data['role']]);

        return response()->json([
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'roles' => [$data['role']],
                'created_at' => $user->created_at?->toISOString(),
            ],
        ], 201);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant');
        $user = $tenant->users()->findOrFail($id);

        app(PermissionRegistrar::class)->setPermissionsTeamId($tenant->getKey());
        if ($user->hasRole('owner')) {
            return response()->json(['message' => 'Cannot remove tenant owner.'], 422);
        }

        $tenant->users()->detach($user->id);

        return response()->json(['message' => 'Staff member removed from pharmacy.']);
    }
}
