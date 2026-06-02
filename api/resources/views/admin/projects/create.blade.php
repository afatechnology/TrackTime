@extends('admin.layout')

@section('title', 'Add project')

@section('content')
<div class="header-row">
    <h2>Add project</h2>
    <a href="{{ route('admin.projects.index') }}" class="btn btn-secondary">Back</a>
</div>

<div class="card">
    <form method="POST" action="{{ route('admin.projects.store') }}">
        @csrf
        @include('admin.projects._form')
        <button type="submit" class="btn btn-primary">Create project</button>
    </form>
</div>
@endsection
