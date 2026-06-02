<?php

namespace Database\Seeders;

use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::factory()->create([
            'name' => 'Admin',
            'email' => 'admin@tracktime.app',
            'password' => 'password',
            'is_admin' => true,
            'is_active' => true,
        ]);

        $user = User::factory()->create([
            'name' => 'Demo User',
            'email' => 'demo@tracktime.app',
            'password' => 'password',
            'is_active' => true,
        ]);

        $sharedProjects = [
            ['name' => 'Website Redesign', 'color' => '#3b82f6', 'client_name' => 'Acme Corp', 'is_shared' => true],
            ['name' => 'Mobile App', 'color' => '#10b981', 'client_name' => 'StartupXYZ', 'is_shared' => true],
            ['name' => 'Internal Admin', 'color' => '#f59e0b', 'is_shared' => true],
        ];

        foreach ($sharedProjects as $data) {
            Project::create([
                'user_id' => $admin->id,
                'uuid' => (string) Str::uuid(),
                ...$data,
            ]);
        }

        Project::create([
            'user_id' => $user->id,
            'uuid' => (string) Str::uuid(),
            'name' => 'Personal Tasks',
            'color' => '#8b5cf6',
            'is_shared' => false,
        ]);
    }
}
