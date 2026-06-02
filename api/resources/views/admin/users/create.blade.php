@extends('admin.layout')

@section('title', 'Add user')

@section('content')
<div class="header-row">
    <h2>Add user</h2>
    <a href="{{ route('admin.users.index') }}" class="btn btn-secondary">Back</a>
</div>

<div class="card">
    <form method="POST" action="{{ route('admin.users.store') }}">
        @csrf
        @include('admin.users._form')
        <button type="submit" class="btn btn-primary">Create user</button>
    </form>
</div>
@endsection
