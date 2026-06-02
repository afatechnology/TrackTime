@extends('admin.layout')

@section('title', 'Users')

@section('content')
<div class="header-row">
    <h2>Users</h2>
    <a href="{{ route('admin.users.create') }}" class="btn btn-primary">Add user</a>
</div>

<div class="card">
    <table>
        <thead>
            <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($users as $user)
                <tr>
                    <td>{{ $user->name }}</td>
                    <td>{{ $user->email }}</td>
                    <td>
                        @if ($user->is_admin)
                            <span class="badge badge-info">Admin</span>
                        @else
                            User
                        @endif
                    </td>
                    <td>
                        @if ($user->is_active)
                            <span class="badge badge-success">Active</span>
                        @else
                            <span class="badge badge-danger">Disabled</span>
                        @endif
                    </td>
                    <td>
                        <a href="{{ route('admin.users.edit', $user) }}" class="btn btn-secondary btn-sm">Edit</a>
                        @if ($user->id !== auth()->id())
                            <form class="inline-form" method="POST" action="{{ route('admin.users.toggle-active', $user) }}">
                                @csrf
                                <button type="submit" class="btn btn-secondary btn-sm">
                                    {{ $user->is_active ? 'Disable' : 'Enable' }}
                                </button>
                            </form>
                            <form class="inline-form" method="POST" action="{{ route('admin.users.destroy', $user) }}" onsubmit="return confirm('Delete this user?')">
                                @csrf
                                @method('DELETE')
                                <button type="submit" class="btn btn-danger btn-sm">Delete</button>
                            </form>
                        @endif
                    </td>
                </tr>
            @endforeach
        </tbody>
    </table>
    <div style="margin-top: 1rem;">{{ $users->links() }}</div>
</div>
@endsection
