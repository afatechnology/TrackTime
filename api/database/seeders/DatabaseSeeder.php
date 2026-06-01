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
        $user = User::factory()->create([
            'name' => 'Demo User',
            'email' => 'demo@tracktime.app',
            'password' => 'password',
        ]);

        $projects = [
            ['name' => 'Website Redesign', 'color' => '#3b82f6', 'client_name' => 'Acme Corp'],
            ['name' => 'Mobile App', 'color' => '#10b981', 'client_name' => 'StartupXYZ'],
            ['name' => 'Internal Admin', 'color' => '#f59e0b'],
        ];

        foreach ($projects as $data) {
            Project::create([
                'user_id' => $user->id,
                'uuid' => (string) Str::uuid(),
                ...$data,
            ]);
        }
    }
}
