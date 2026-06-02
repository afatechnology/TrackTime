@extends('admin.layout')

@section('title', 'Reports')

@section('content')
<div class="header-row">
    <h2>Reports — all users</h2>
</div>

<form method="GET" class="filters card">
    <label>
        <span>Period</span>
        <select name="period" onchange="this.form.submit()">
            <option value="day" {{ $period === 'day' ? 'selected' : '' }}>Today</option>
            <option value="week" {{ $period === 'week' ? 'selected' : '' }}>This week</option>
            <option value="month" {{ $period === 'month' ? 'selected' : '' }}>This month</option>
            <option value="custom" {{ $period === 'custom' ? 'selected' : '' }}>Custom</option>
        </select>
    </label>
    @if ($period === 'custom')
        <label><span>From</span><input type="date" name="from" value="{{ $from }}"></label>
        <label><span>To</span><input type="date" name="to" value="{{ $to }}"></label>
    @endif
    <label>
        <span>User</span>
        <select name="user_id">
            <option value="">All users</option>
            @foreach ($users as $user)
                <option value="{{ $user->id }}" {{ $selectedUserId == $user->id ? 'selected' : '' }}>{{ $user->name }}</option>
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
</div>

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
@endsection
