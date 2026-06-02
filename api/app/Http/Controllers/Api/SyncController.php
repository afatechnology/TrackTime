<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProjectResource;
use App\Http\Resources\TimeEntryResource;
use App\Models\Project;
use App\Models\TimeEntry;
use App\Models\TimeSegment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SyncController extends Controller
{
    public function pull(Request $request): JsonResponse
    {
        $since = $request->filled('since')
            ? Carbon::parse($request->string('since'))
            : null;

        $user = $request->user();

        $projectsQuery = Project::accessibleBy($user)->withTrashed();
        $entriesQuery = $user->timeEntries()->withTrashed()->with(['project', 'segments']);

        if ($since) {
            $projectsQuery->where('updated_at', '>=', $since);
            $entriesQuery->where('updated_at', '>=', $since);
        }

        return response()->json([
            'server_time' => now()->toIso8601String(),
            'projects' => ProjectResource::collection($projectsQuery->get()),
            'time_entries' => TimeEntryResource::collection($entriesQuery->get()),
        ]);
    }

    public function push(Request $request): JsonResponse
    {
        $data = $request->validate([
            'projects' => ['nullable', 'array'],
            'projects.*.uuid' => ['required', 'uuid'],
            'projects.*.name' => ['required', 'string', 'max:255'],
            'projects.*.description' => ['nullable', 'string'],
            'projects.*.color' => ['nullable', 'string'],
            'projects.*.is_archived' => ['nullable', 'boolean'],
            'projects.*.client_name' => ['nullable', 'string'],
            'projects.*.hourly_rate' => ['nullable', 'numeric'],
            'projects.*.updated_at' => ['nullable', 'date'],
            'projects.*.deleted_at' => ['nullable', 'date'],
            'time_entries' => ['nullable', 'array'],
            'time_entries.*.uuid' => ['required', 'uuid'],
            'time_entries.*.project_uuid' => ['required', 'uuid'],
            'time_entries.*.started_at' => ['required', 'date'],
            'time_entries.*.ended_at' => ['nullable', 'date'],
            'time_entries.*.status' => ['required', 'in:running,paused,completed'],
            'time_entries.*.notes' => ['nullable', 'string'],
            'time_entries.*.task_title' => ['nullable', 'string'],
            'time_entries.*.segments' => ['nullable', 'array'],
            'time_entries.*.segments.*.uuid' => ['required', 'uuid'],
            'time_entries.*.segments.*.started_at' => ['required', 'date'],
            'time_entries.*.segments.*.ended_at' => ['nullable', 'date'],
            'time_entries.*.updated_at' => ['nullable', 'date'],
            'time_entries.*.deleted_at' => ['nullable', 'date'],
        ]);

        $user = $request->user();

        DB::transaction(function () use ($data, $user) {
            foreach ($data['projects'] ?? [] as $payload) {
                $this->upsertProject($user->id, $payload);
            }

            foreach ($data['time_entries'] ?? [] as $payload) {
                $this->upsertTimeEntry($user->id, $payload);
            }
        });

        return response()->json([
            'message' => 'Sync completed',
            'server_time' => now()->toIso8601String(),
        ]);
    }

    private function upsertProject(int $userId, array $payload): void
    {
        $existing = Project::withTrashed()->where('uuid', $payload['uuid'])->first();

        if ($existing?->is_shared && $existing->user_id !== $userId) {
            return;
        }

        $project = $existing ?? new Project(['uuid' => $payload['uuid']]);
        if (! $project->exists || ! $project->is_shared) {
            $project->user_id = $userId;
        }
        $project->name = $payload['name'];
        $project->description = $payload['description'] ?? null;
        $project->color = $payload['color'] ?? '#3b82f6';
        $project->is_archived = $payload['is_archived'] ?? false;
        $project->client_name = $payload['client_name'] ?? null;
        $project->hourly_rate = $payload['hourly_rate'] ?? null;

        if (! empty($payload['deleted_at'])) {
            $project->deleted_at = Carbon::parse($payload['deleted_at']);
        } else {
            $project->deleted_at = null;
        }

        $project->save();
    }

    private function upsertTimeEntry(int $userId, array $payload): void
    {
        $project = Project::query()
            ->where('uuid', $payload['project_uuid'])
            ->where(function ($q) use ($userId) {
                $q->where('user_id', $userId)->orWhere('is_shared', true);
            })
            ->first();

        if (! $project) {
            return;
        }

        $entry = TimeEntry::withTrashed()->firstOrNew(['uuid' => $payload['uuid']]);
        $entry->user_id = $userId;
        $entry->project_id = $project->id;
        $entry->started_at = Carbon::parse($payload['started_at']);
        $entry->ended_at = isset($payload['ended_at']) ? Carbon::parse($payload['ended_at']) : null;
        $entry->status = $payload['status'];
        $entry->notes = $payload['notes'] ?? null;
        $entry->task_title = $payload['task_title'] ?? null;

        if (! empty($payload['deleted_at'])) {
            $entry->deleted_at = Carbon::parse($payload['deleted_at']);
        } else {
            $entry->deleted_at = null;
        }

        $entry->save();

        foreach ($payload['segments'] ?? [] as $segmentPayload) {
            $segment = TimeSegment::firstOrNew(['uuid' => $segmentPayload['uuid']]);
            $segment->time_entry_id = $entry->id;
            $segment->started_at = Carbon::parse($segmentPayload['started_at']);
            $segment->ended_at = isset($segmentPayload['ended_at'])
                ? Carbon::parse($segmentPayload['ended_at'])
                : null;
            $segment->save();
        }
    }
}
