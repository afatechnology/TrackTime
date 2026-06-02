@extends('admin.layout')

@section('title', 'Projects')

@section('content')
<div class="header-row">
    <h2>Projects</h2>
    <a href="{{ route('admin.projects.create') }}" class="btn btn-primary">Add project</a>
</div>

<div class="card">
    <table>
        <thead>
            <tr>
                <th>Name</th>
                <th>Client</th>
                <th>Shared</th>
                <th>Owner</th>
                <th>Status</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($projects as $project)
                <tr>
                    <td>
                        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:{{ $project->color }};margin-right:6px;"></span>
                        {{ $project->name }}
                    </td>
                    <td>{{ $project->client_name ?? '—' }}</td>
                    <td>
                        @if ($project->is_shared)
                            <span class="badge badge-info">Shared</span>
                        @else
                            Private
                        @endif
                    </td>
                    <td>{{ $project->user?->name ?? '—' }}</td>
                    <td>{{ $project->is_archived ? 'Archived' : 'Active' }}</td>
                    <td>
                        <a href="{{ route('admin.projects.edit', $project) }}" class="btn btn-secondary btn-sm">Edit</a>
                        <form class="inline-form" method="POST" action="{{ route('admin.projects.destroy', $project) }}" onsubmit="return confirm('Delete this project?')">
                            @csrf
                            @method('DELETE')
                            <button type="submit" class="btn btn-danger btn-sm">Delete</button>
                        </form>
                    </td>
                </tr>
            @endforeach
        </tbody>
    </table>
    <div style="margin-top: 1rem;">{{ $projects->links() }}</div>
</div>
@endsection
