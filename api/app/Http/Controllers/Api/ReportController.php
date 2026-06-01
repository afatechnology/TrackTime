<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\TimeEntryResource;
use App\Models\TimeEntry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class ReportController extends Controller
{
    public function summary(Request $request): JsonResponse
    {
        $range = $this->resolveRange($request);
        $userId = $request->user()->id;

        $entries = TimeEntry::query()
            ->forUser($userId)
            ->with(['project', 'segments'])
            ->where('status', 'completed')
            ->inRange($range['from'], $range['to'])
            ->get();

        $byProject = [];
        $totalSeconds = 0;

        foreach ($entries as $entry) {
            $seconds = $entry->totalSeconds();
            $totalSeconds += $seconds;
            $projectId = $entry->project_id;
            if (! isset($byProject[$projectId])) {
                $byProject[$projectId] = [
                    'project_id' => $projectId,
                    'project_name' => $entry->project?->name ?? 'Unknown',
                    'project_color' => $entry->project?->color ?? '#64748b',
                    'total_seconds' => 0,
                    'entry_count' => 0,
                ];
            }
            $byProject[$projectId]['total_seconds'] += $seconds;
            $byProject[$projectId]['entry_count']++;
        }

        $byDay = [];
        foreach ($entries as $entry) {
            $day = $entry->started_at->toDateString();
            if (! isset($byDay[$day])) {
                $byDay[$day] = ['date' => $day, 'total_seconds' => 0, 'entry_count' => 0];
            }
            $byDay[$day]['total_seconds'] += $entry->totalSeconds();
            $byDay[$day]['entry_count']++;
        }
        ksort($byDay);

        return response()->json([
            'period' => $range['period'],
            'from' => $range['from']->toIso8601String(),
            'to' => $range['to']->toIso8601String(),
            'total_seconds' => $totalSeconds,
            'total_hours' => round($totalSeconds / 3600, 2),
            'entry_count' => $entries->count(),
            'by_project' => array_values($byProject),
            'by_day' => array_values($byDay),
            'entries' => TimeEntryResource::collection($entries),
        ]);
    }

    private function resolveRange(Request $request): array
    {
        $period = $request->string('period', 'week')->toString();

        if ($period === 'custom') {
            $request->validate([
                'from' => ['required', 'date'],
                'to' => ['required', 'date', 'after_or_equal:from'],
            ]);
            $from = Carbon::parse($request->string('from'))->startOfDay();
            $to = Carbon::parse($request->string('to'))->endOfDay();

            return compact('period', 'from', 'to');
        }

        $now = now();

        return match ($period) {
            'day' => [
                'period' => 'day',
                'from' => $now->copy()->startOfDay(),
                'to' => $now->copy()->endOfDay(),
            ],
            'week' => [
                'period' => 'week',
                'from' => $now->copy()->startOfWeek(),
                'to' => $now->copy()->endOfWeek(),
            ],
            'month' => [
                'period' => 'month',
                'from' => $now->copy()->startOfMonth(),
                'to' => $now->copy()->endOfMonth(),
            ],
            default => [
                'period' => 'week',
                'from' => $now->copy()->startOfWeek(),
                'to' => $now->copy()->endOfWeek(),
            ],
        };
    }
}
