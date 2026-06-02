@extends('admin.layout')

@section('title', 'Edit user')

@section('content')
<div class="header-row">
    <h2>Edit user</h2>
    <a href="{{ route('admin.users.index') }}" class="btn btn-secondary">Back</a>
</div>

<div class="card">
    <form method="POST" action="{{ route('admin.users.update', $user) }}">
        @csrf
        @method('PUT')
        @include('admin.users._form', ['user' => $user])
        <button type="submit" class="btn btn-primary">Save changes</button>
    </form>
</div>
@endsection
