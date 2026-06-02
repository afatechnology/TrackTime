<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Project;
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
        $projectId = $request->integer('project_id') ?: null;

        $query = TimeEntry::with(['user', 'project', 'segments'])
            ->where('status', 'completed')
            ->whereBetween('started_at', [$range['from'], $range['to']]);

        if ($userId) {
            $query->where('user_id', $userId);
        }

        if ($projectId) {
            $query->where('project_id', $projectId);
        }

        $entries = $query->orderByDesc('started_at')->limit(500)->get();

        $byUser = [];
        $byProject = [];
        $byProjectUser = [];
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

            $pid = $entry->project_id;
            if (! isset($byProject[$pid])) {
                $byProject[$pid] = [
                    'project_id' => $pid,
                    'project_name' => $entry->project?->name ?? 'Unknown',
                    'total_seconds' => 0,
                    'entry_count' => 0,
                ];
            }
            $byProject[$pid]['total_seconds'] += $seconds;
            $byProject[$pid]['entry_count']++;

            $key = "{$pid}:{$uid}";
            if (! isset($byProjectUser[$key])) {
                $byProjectUser[$key] = [
                    'project_id' => $pid,
                    'project_name' => $entry->project?->name ?? 'Unknown',
                    'user_id' => $uid,
                    'user_name' => $entry->user?->name ?? 'Unknown',
                    'total_seconds' => 0,
                    'entry_count' => 0,
                ];
            }
            $byProjectUser[$key]['total_seconds'] += $seconds;
            $byProjectUser[$key]['entry_count']++;
        }

        usort($byUser, fn ($a, $b) => $b['total_seconds'] <=> $a['total_seconds']);
        usort($byProject, fn ($a, $b) => $b['total_seconds'] <=> $a['total_seconds']);
        usort($byProjectUser, fn ($a, $b) => $b['total_seconds'] <=> $a['total_seconds']);

        $users = User::orderBy('name')->get(['id', 'name', 'email']);
        $projects = Project::orderBy('name')->get(['id', 'name']);

        return view('admin.reports.index', [
            'entries' => $entries,
            'byUser' => $byUser,
            'byProject' => $byProject,
            'byProjectUser' => $byProjectUser,
            'totalSeconds' => $totalSeconds,
            'users' => $users,
            'projects' => $projects,
            'selectedUserId' => $userId,
            'selectedProjectId' => $projectId,
            'period' => $range['period'],
            'from' => $range['from']->toDateString(),
            'to' => $range['to']->toDateString(),
        ]);
    }

    private function resolveRange(Request $request): array
    {
        $period = $request->string('period', 'week')->toString();
        $now = now();

        if ($period === 'custom') {
            $from = $request->filled('from')
                ? Carbon::parse($request->string('from'))->startOfDay()
                : $now->copy()->subDays(30)->startOfDay();
            $to = $request->filled('to')
                ? Carbon::parse($request->string('to'))->endOfDay()
                : $now->copy()->endOfDay();

            if ($from->gt($to)) {
                [$from, $to] = [$to->copy()->startOfDay(), $from->copy()->endOfDay()];
            }

            return [
                'period' => 'custom',
                'from' => $from,
                'to' => $to,
            ];
        }

        return match ($period) {
            'day' => ['period' => 'day', 'from' => $now->copy()->startOfDay(), 'to' => $now->copy()->endOfDay()],
            'month' => ['period' => 'month', 'from' => $now->copy()->startOfMonth(), 'to' => $now->copy()->endOfMonth()],
            default => ['period' => 'week', 'from' => $now->copy()->startOfWeek(), 'to' => $now->copy()->endOfWeek()],
        };
    }
}
