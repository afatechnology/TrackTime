@extends('admin.layout')

@section('title', 'Dashboard')

@section('content')
<div class="header-row">
    <h2>Dashboard</h2>
</div>

<div class="stats">
    <div class="stat"><div class="label">Users</div><div class="value">{{ $stats['users'] }}</div></div>
    <div class="stat"><div class="label">Active users</div><div class="value">{{ $stats['active_users'] }}</div></div>
    <div class="stat"><div class="label">Projects</div><div class="value">{{ $stats['projects'] }}</div></div>
    <div class="stat"><div class="label">Shared projects</div><div class="value">{{ $stats['shared_projects'] }}</div></div>
    <div class="stat"><div class="label">Time entries</div><div class="value">{{ $stats['time_entries'] }}</div></div>
    <div class="stat"><div class="label">Total hours</div><div class="value">{{ $stats['total_hours'] }}</div></div>
</div>

<div class="card">
    <h3 style="margin-top: 0;">Recent activity</h3>
    <table>
        <thead>
            <tr>
                <th>User</th>
                <th>Project</th>
                <th>Task</th>
                <th>Duration</th>
                <th>Date</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($recentEntries as $entry)
                <tr>
                    <td>{{ $entry->user?->name }}</td>
                    <td>{{ $entry->project?->name }}</td>
                    <td>{{ $entry->task_title ?? '—' }}</td>
                    <td>{{ gmdate('H:i:s', $entry->totalSeconds()) }}</td>
                    <td>{{ $entry->started_at->format('M j, Y') }}</td>
                </tr>
            @empty
                <tr><td colspan="5" style="color: var(--muted);">No entries yet</td></tr>
            @endforelse
        </tbody>
    </table>
</div>
@endsection
