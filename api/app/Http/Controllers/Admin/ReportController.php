<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\TimeEntry;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\View\View;

class ReportController extends Controller
{
    public function index(Request $request): View
    {
        $range = $this->resolveRange($request);
        $userId = $request->integer('user_id') ?: null;

        $query = TimeEntry::with(['user', 'project', 'segments'])
            ->where('status', 'completed')
            ->whereBetween('started_at', [$range['from'], $range['to']]);

        if ($userId) {
            $query->where('user_id', $userId);
        }

        $entries = $query->orderByDesc('started_at')->limit(500)->get();

        $byUser = [];
        $totalSeconds = 0;

        foreach ($entries as $entry) {
            $seconds = $entry->totalSeconds();
            $totalSeconds += $seconds;
            $uid = $entry->user_id;
            if (! isset($byUser[$uid])) {
                $byUser[$uid] = [
                    'user_id' => $uid,
                    'user_name' => $entry->user?->name ?? 'Unknown',
                    'total_seconds' => 0,
                    'entry_count' => 0,
                ];
            }
            $byUser[$uid]['total_seconds'] += $seconds;
            $byUser[$uid]['entry_count']++;
        }

        usort($byUser, fn ($a, $b) => $b['total_seconds'] <=> $a['total_seconds']);

        $users = User::orderBy('name')->get(['id', 'name', 'email']);

        return view('admin.reports.index', [
            'entries' => $entries,
            'byUser' => $byUser,
            'totalSeconds' => $totalSeconds,
            'users' => $users,
            'selectedUserId' => $userId,
            'period' => $range['period'],
            'from' => $range['from']->toDateString(),
            'to' => $range['to']->toDateString(),
        ]);
    }

    private function resolveRange(Request $request): array
    {
        $period = $request->string('period', 'week')->toString();

        if ($period === 'custom' && $request->filled('from') && $request->filled('to')) {
            return [
                'period' => 'custom',
                'from' => Carbon::parse($request->string('from'))->startOfDay(),
                'to' => Carbon::parse($request->string('to'))->endOfDay(),
            ];
        }

        $now = now();

        return match ($period) {
            'day' => ['period' => 'day', 'from' => $now->copy()->startOfDay(), 'to' => $now->copy()->endOfDay()],
            'month' => ['period' => 'month', 'from' => $now->copy()->startOfMonth(), 'to' => $now->copy()->endOfMonth()],
            default => ['period' => 'week', 'from' => $now->copy()->startOfWeek(), 'to' => $now->copy()->endOfWeek()],
        };
    }
}
