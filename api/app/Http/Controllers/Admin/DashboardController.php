<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\TimeEntry;
use App\Models\User;
use Illuminate\View\View;

class DashboardController extends Controller
{
    public function index(): View
    {
        $stats = [
            'users' => User::count(),
            'active_users' => User::where('is_active', true)->count(),
            'projects' => Project::count(),
            'shared_projects' => Project::where('is_shared', true)->count(),
            'time_entries' => TimeEntry::where('status', 'completed')->count(),
            'total_hours' => round(
                TimeEntry::where('status', 'completed')
                    ->with('segments')
                    ->get()
                    ->sum(fn ($e) => $e->totalSeconds()) / 3600,
                1
            ),
        ];

        $recentEntries = TimeEntry::with(['user', 'project'])
            ->where('status', 'completed')
            ->latest('started_at')
            ->limit(10)
            ->get();

        return view('admin.dashboard', compact('stats', 'recentEntries'));
    }
}
