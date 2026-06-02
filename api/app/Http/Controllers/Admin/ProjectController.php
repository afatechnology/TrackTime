<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Project;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\View\View;

class ProjectController extends Controller
{
    public function index(): View
    {
        $projects = Project::with('user')
            ->orderByDesc('is_shared')
            ->orderBy('name')
            ->paginate(20);

        return view('admin.projects.index', compact('projects'));
    }

    public function create(): View
    {
        return view('admin.projects.create');
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'color' => ['nullable', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'client_name' => ['nullable', 'string', 'max:255'],
            'hourly_rate' => ['nullable', 'numeric', 'min:0'],
            'is_shared' => ['nullable', 'boolean'],
            'is_archived' => ['nullable', 'boolean'],
        ]);

        Project::create([
            'user_id' => $request->user()->id,
            'uuid' => (string) Str::uuid(),
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'color' => $data['color'] ?? '#3b82f6',
            'client_name' => $data['client_name'] ?? null,
            'hourly_rate' => $data['hourly_rate'] ?? null,
            'is_shared' => $request->boolean('is_shared'),
            'is_archived' => $request->boolean('is_archived'),
        ]);

        return redirect()->route('admin.projects.index')->with('success', 'Project created.');
    }

    public function edit(Project $project): View
    {
        return view('admin.projects.edit', compact('project'));
    }

    public function update(Request $request, Project $project): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'color' => ['nullable', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'client_name' => ['nullable', 'string', 'max:255'],
            'hourly_rate' => ['nullable', 'numeric', 'min:0'],
            'is_shared' => ['nullable', 'boolean'],
            'is_archived' => ['nullable', 'boolean'],
        ]);

        $project->update([
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'color' => $data['color'] ?? '#3b82f6',
            'client_name' => $data['client_name'] ?? null,
            'hourly_rate' => $data['hourly_rate'] ?? null,
            'is_shared' => $request->boolean('is_shared'),
            'is_archived' => $request->boolean('is_archived'),
        ]);

        return redirect()->route('admin.projects.index')->with('success', 'Project updated.');
    }

    public function destroy(Project $project): RedirectResponse
    {
        $project->delete();

        return redirect()->route('admin.projects.index')->with('success', 'Project deleted.');
    }
}
