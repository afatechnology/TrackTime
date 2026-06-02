<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>@yield('title', 'Admin') — TrackTime</title>
    <style>
        :root {
            --bg: #0f1419;
            --surface: #1a2332;
            --surface2: #243044;
            --text: #e8eef7;
            --muted: #8b9cb3;
            --primary: #3b82f6;
            --danger: #ef4444;
            --success: #10b981;
            --radius: 8px;
        }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: 'Segoe UI', system-ui, sans-serif; background: var(--bg); color: var(--text); }
        a { color: var(--primary); text-decoration: none; }
        a:hover { text-decoration: underline; }
        .admin-shell { display: flex; min-height: 100vh; }
        .sidebar {
            width: 220px;
            background: var(--surface);
            border-right: 1px solid var(--surface2);
            padding: 1.5rem 1rem;
            flex-shrink: 0;
        }
        .sidebar h1 { font-size: 1.1rem; margin: 0 0 1.5rem; }
        .sidebar nav a {
            display: block;
            padding: 0.5rem 0.75rem;
            border-radius: var(--radius);
            color: var(--muted);
            margin-bottom: 0.25rem;
        }
        .sidebar nav a:hover, .sidebar nav a.active {
            background: var(--surface2);
            color: var(--text);
            text-decoration: none;
        }
        .main { flex: 1; padding: 2rem; overflow-x: auto; }
        .flash { padding: 0.75rem 1rem; border-radius: var(--radius); margin-bottom: 1rem; }
        .flash.success { background: rgba(16, 185, 129, 0.15); color: var(--success); }
        .flash.error { background: rgba(239, 68, 68, 0.15); color: var(--danger); }
        .card {
            background: var(--surface);
            border: 1px solid var(--surface2);
            border-radius: 12px;
            padding: 1.25rem;
            margin-bottom: 1rem;
        }
        .stats { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
        .stat { background: var(--surface); border: 1px solid var(--surface2); border-radius: 12px; padding: 1rem; }
        .stat .label { color: var(--muted); font-size: 0.85rem; }
        .stat .value { font-size: 1.75rem; font-weight: 600; margin-top: 0.25rem; }
        table { width: 100%; border-collapse: collapse; }
        th, td { text-align: left; padding: 0.6rem 0.75rem; border-bottom: 1px solid var(--surface2); }
        th { color: var(--muted); font-weight: 500; font-size: 0.85rem; }
        .btn {
            display: inline-block;
            padding: 0.45rem 0.9rem;
            border-radius: var(--radius);
            border: none;
            cursor: pointer;
            font-size: 0.9rem;
            text-decoration: none;
        }
        .btn-primary { background: var(--primary); color: #fff; }
        .btn-primary:hover { filter: brightness(1.1); text-decoration: none; }
        .btn-secondary { background: var(--surface2); color: var(--text); }
        .btn-danger { background: var(--danger); color: #fff; }
        .btn-sm { padding: 0.3rem 0.6rem; font-size: 0.8rem; }
        label { display: block; margin-bottom: 0.75rem; }
        label span { display: block; color: var(--muted); font-size: 0.85rem; margin-bottom: 0.25rem; }
        input, select, textarea {
            width: 100%;
            max-width: 400px;
            padding: 0.5rem 0.75rem;
            border-radius: var(--radius);
            border: 1px solid var(--surface2);
            background: var(--bg);
            color: var(--text);
        }
        .badge { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.75rem; }
        .badge-success { background: rgba(16,185,129,0.2); color: var(--success); }
        .badge-danger { background: rgba(239,68,68,0.2); color: var(--danger); }
        .badge-info { background: rgba(59,130,246,0.2); color: var(--primary); }
        .header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
        .header-row h2 { margin: 0; }
        .inline-form { display: inline; }
        .filters { display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: end; margin-bottom: 1rem; }
        .filters label { margin-bottom: 0; }
        .filters input, .filters select { max-width: 160px; }
    </style>
</head>
<body>
@auth
<div class="admin-shell">
    <aside class="sidebar">
        <h1>TrackTime Admin</h1>
        <nav>
            <a href="{{ route('admin.dashboard') }}" class="{{ request()->routeIs('admin.dashboard') ? 'active' : '' }}">Dashboard</a>
            <a href="{{ route('admin.users.index') }}" class="{{ request()->routeIs('admin.users.*') ? 'active' : '' }}">Users</a>
            <a href="{{ route('admin.projects.index') }}" class="{{ request()->routeIs('admin.projects.*') ? 'active' : '' }}">Projects</a>
            <a href="{{ route('admin.reports.index') }}" class="{{ request()->routeIs('admin.reports.*') ? 'active' : '' }}">Reports</a>
        </nav>
        <form method="POST" action="{{ route('admin.logout') }}" style="margin-top: 2rem;">
            @csrf
            <button type="submit" class="btn btn-secondary btn-sm">Log out</button>
        </form>
    </aside>
    <main class="main">
        @if (session('success'))
            <div class="flash success">{{ session('success') }}</div>
        @endif
        @if ($errors->any())
            <div class="flash error">
                <ul style="margin: 0; padding-left: 1.2rem;">
                    @foreach ($errors->all() as $error)
                        <li>{{ $error }}</li>
                    @endforeach
                </ul>
            </div>
        @endif
        @yield('content')
    </main>
</div>
@else
    @yield('content')
@endauth
</body>
</html>
