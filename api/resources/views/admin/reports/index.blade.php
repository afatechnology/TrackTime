@extends('admin.layout')

@section('title', 'Reports')

@section('content')
<div class="header-row">
    <h2>Reports — all users</h2>
</div>

<form method="GET" class="filters card" id="report-filters">
    <label>
        <span>Period</span>
        <select name="period" id="period-select">
            <option value="day" {{ $period === 'day' ? 'selected' : '' }}>Today</option>
            <option value="week" {{ $period === 'week' ? 'selected' : '' }}>This week</option>
            <option value="month" {{ $period === 'month' ? 'selected' : '' }}>This month</option>
            <option value="custom" {{ $period === 'custom' ? 'selected' : '' }}>Custom</option>
        </select>
    </label>
    <div id="custom-dates" class="custom-dates" style="{{ $period === 'custom' ? '' : 'display:none' }}">
        <label><span>From</span><input type="date" name="from" value="{{ $from }}"></label>
        <label><span>To</span><input type="date" name="to" value="{{ $to }}"></label>
    </div>
    <label>
        <span>User</span>
        <select name="user_id">
            <option value="">All users</option>
            @foreach ($users as $user)
                <option value="{{ $user->id }}" {{ $selectedUserId == $user->id ? 'selected' : '' }}>{{ $user->name }}</option>
            @endforeach
        </select>
    </label>
    <label>
        <span>Project</span>
        <select name="project_id">
            <option value="">All projects</option>
            @foreach ($projects as $project)
                <option value="{{ $project->id }}" {{ $selectedProjectId == $project->id ? 'selected' : '' }}>{{ $project->name }}</option>
            @endforeach
        </select>
    </label>
    <button type="submit" class="btn btn-primary">Apply</button>
</form>

<div class="stats">
    <div class="stat">
        <div class="label">Total time</div>
        <div class="value">{{ gmdate('H:i', $totalSeconds) }}</div>
    </div>
    <div class="stat">
        <div class="label">Entries</div>
        <div class="value">{{ $entries->count() }}</div>
    </div>
    <div class="stat">
        <div class="label">Range</div>
        <div class="value" style="font-size: 1rem;">{{ $from }} → {{ $to }}</div>
    </div>
</div>

@if (count($byProject))
<div class="card">
    <h3 style="margin-top: 0;">By project</h3>
    <table>
        <thead>
            <tr><th>Project</th><th>Hours</th><th>Entries</th></tr>
        </thead>
        <tbody>
            @foreach ($byProject as $row)
                <tr>
                    <td>{{ $row['project_name'] }}</td>
                    <td>{{ round($row['total_seconds'] / 3600, 2) }}</td>
                    <td>{{ $row['entry_count'] }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>
</div>
@endif

@if (count($byUser))
<div class="card">
    <h3 style="margin-top: 0;">By user</h3>
    <table>
        <thead>
            <tr><th>User</th><th>Hours</th><th>Entries</th></tr>
        </thead>
        <tbody>
            @foreach ($byUser as $row)
                <tr>
                    <td>{{ $row['user_name'] }}</td>
                    <td>{{ round($row['total_seconds'] / 3600, 2) }}</td>
                    <td>{{ $row['entry_count'] }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>
</div>
@endif

@if (count($byProjectUser))
<div class="card">
    <h3 style="margin-top: 0;">By project &amp; user</h3>
    <table>
        <thead>
            <tr><th>Project</th><th>User</th><th>Hours</th><th>Entries</th></tr>
        </thead>
        <tbody>
            @foreach ($byProjectUser as $row)
                <tr>
                    <td>{{ $row['project_name'] }}</td>
                    <td>{{ $row['user_name'] }}</td>
                    <td>{{ round($row['total_seconds'] / 3600, 2) }}</td>
                    <td>{{ $row['entry_count'] }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>
</div>
@endif

<div class="card">
    <h3 style="margin-top: 0;">Time entries</h3>
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
            @forelse ($entries as $entry)
                <tr>
                    <td>{{ $entry->user?->name }}</td>
                    <td>{{ $entry->project?->name }}</td>
                    <td>{{ $entry->task_title ?? '—' }}</td>
                    <td>{{ gmdate('H:i:s', $entry->totalSeconds()) }}</td>
                    <td>{{ $entry->started_at->format('M j, Y H:i') }}</td>
                </tr>
            @empty
                <tr><td colspan="5" style="color: var(--muted);">No entries in this period</td></tr>
            @endforelse
        </tbody>
    </table>
</div>

<script>
    document.getElementById('period-select')?.addEventListener('change', function () {
        const custom = document.getElementById('custom-dates');
        if (custom) custom.style.display = this.value === 'custom' ? 'flex' : 'none';
    });
</script>
@endsection
