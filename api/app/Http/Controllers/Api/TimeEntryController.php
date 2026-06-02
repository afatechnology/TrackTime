<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\TimeEntryResource;
use App\Models\Project;
use App\Models\TimeEntry;
use App\Models\TimeSegment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class TimeEntryController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = $request->user()
            ->timeEntries()
            ->with(['project', 'segments'])
            ->orderByDesc('started_at');

        if ($request->filled('project_id')) {
            $query->where('project_id', $request->integer('project_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        if ($request->filled('from') && $request->filled('to')) {
            $query->inRange(
                Carbon::parse($request->string('from'))->startOfDay(),
                Carbon::parse($request->string('to'))->endOfDay()
            );
        }

        $limit = min((int) $request->input('limit', 100), 500);

        return TimeEntryResource::collection($query->limit($limit)->get());
    }

    public function active(Request $request): JsonResponse
    {
        $entry = $request->user()
            ->timeEntries()
            ->with(['project', 'segments'])
            ->whereIn('status', ['running', 'paused'])
            ->latest('started_at')
            ->first();

        return response()->json([
            'entry' => $entry ? new TimeEntryResource($entry) : null,
        ]);
    }

    public function start(Request $request): JsonResponse
    {
        $data = $request->validate([
            'project_id' => ['required', 'integer'],
            'uuid' => ['nullable', 'uuid', 'unique:time_entries,uuid'],
            'task_title' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
            'started_at' => ['nullable', 'date'],
        ]);

        $project = $this->findUserProject($request, $data['project_id']);

        $existing = $request->user()
            ->timeEntries()
            ->whereIn('status', ['running', 'paused'])
            ->first();

        if ($existing) {
            return response()->json([
                'message' => 'You already have an active timer. Pause or finish it first.',
                'entry' => new TimeEntryResource($existing->load(['project', 'segments'])),
            ], 409);
        }

        $startedAt = isset($data['started_at'])
            ? Carbon::parse($data['started_at'])
            : now();

        $entry = $request->user()->timeEntries()->create([
            'project_id' => $project->id,
            'uuid' => $data['uuid'] ?? (string) Str::uuid(),
            'started_at' => $startedAt,
            'status' => 'running',
            'task_title' => $data['task_title'] ?? null,
            'notes' => $data['notes'] ?? null,
        ]);

        $entry->segments()->create([
            'uuid' => (string) Str::uuid(),
            'started_at' => $startedAt,
        ]);

        return response()->json([
            'entry' => new TimeEntryResource($entry->load(['project', 'segments'])),
        ], 201);
    }

    public function pause(Request $request, TimeEntry $timeEntry): JsonResponse
    {
        $this->authorizeEntry($request, $timeEntry);

        if ($timeEntry->status !== 'running') {
            return response()->json(['message' => 'Timer is not running.'], 422);
        }

        $now = now();
        $openSegment = $timeEntry->segments()->whereNull('ended_at')->latest('id')->first();

        if ($openSegment) {
            $openSegment->update(['ended_at' => $now]);
        }

        $timeEntry->update(['status' => 'paused']);

        return response()->json([
            'entry' => new TimeEntryResource($timeEntry->fresh()->load(['project', 'segments'])),
        ]);
    }

    public function resume(Request $request, TimeEntry $timeEntry): JsonResponse
    {
        $this->authorizeEntry($request, $timeEntry);

        if ($timeEntry->status !== 'paused') {
            return response()->json(['message' => 'Timer is not paused.'], 422);
        }

        $otherActive = $request->user()
            ->timeEntries()
            ->whereIn('status', ['running', 'paused'])
            ->where('id', '!=', $timeEntry->id)
            ->exists();

        if ($otherActive) {
            return response()->json(['message' => 'Another timer is already active.'], 409);
        }

        $now = now();
        $timeEntry->segments()->create([
            'uuid' => (string) Str::uuid(),
            'started_at' => $now,
        ]);
        $timeEntry->update(['status' => 'running']);

        return response()->json([
            'entry' => new TimeEntryResource($timeEntry->fresh()->load(['project', 'segments'])),
        ]);
    }

    public function finish(Request $request, TimeEntry $timeEntry): JsonResponse
    {
        $this->authorizeEntry($request, $timeEntry);

        if ($timeEntry->status === 'completed') {
            return response()->json(['message' => 'Timer already completed.'], 422);
        }

        $data = $request->validate([
            'notes' => ['nullable', 'string'],
            'task_title' => ['nullable', 'string', 'max:255'],
            'ended_at' => ['nullable', 'date'],
        ]);

        $now = isset($data['ended_at']) ? Carbon::parse($data['ended_at']) : now();

        $openSegment = $timeEntry->segments()->whereNull('ended_at')->latest('id')->first();
        if ($openSegment) {
            $openSegment->update(['ended_at' => $now]);
        }

        $timeEntry->update([
            'status' => 'completed',
            'ended_at' => $now,
            'notes' => $data['notes'] ?? $timeEntry->notes,
            'task_title' => $data['task_title'] ?? $timeEntry->task_title,
        ]);

        return response()->json([
            'entry' => new TimeEntryResource($timeEntry->fresh()->load(['project', 'segments'])),
        ]);
    }

    public function update(Request $request, TimeEntry $timeEntry): TimeEntryResource
    {
        $this->authorizeEntry($request, $timeEntry);

        $data = $request->validate([
            'notes' => ['nullable', 'string'],
            'task_title' => ['nullable', 'string', 'max:255'],
            'project_id' => ['sometimes', 'integer'],
        ]);

        if (isset($data['project_id'])) {
            $this->findUserProject($request, $data['project_id']);
        }

        $timeEntry->update($data);

        return new TimeEntryResource($timeEntry->fresh()->load(['project', 'segments']));
    }

    public function destroy(Request $request, TimeEntry $timeEntry): JsonResponse
    {
        $this->authorizeEntry($request, $timeEntry);
        $timeEntry->delete();

        return response()->json(['message' => 'Time entry deleted']);
    }

    private function findUserProject(Request $request, int $projectId): Project
    {
        return $request->user()->projects()->whereKey($projectId)->firstOrFail();
    }

    private function authorizeEntry(Request $request, TimeEntry $timeEntry): void
    {
        abort_unless($timeEntry->user_id === $request->user()->id, 403);
    }
}
