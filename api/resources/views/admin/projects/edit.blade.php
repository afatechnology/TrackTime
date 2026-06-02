@extends('admin.layout')

@section('title', 'Edit project')

@section('content')
<div class="header-row">
    <h2>Edit project</h2>
    <a href="{{ route('admin.projects.index') }}" class="btn btn-secondary">Back</a>
</div>

<div class="card">
    <form method="POST" action="{{ route('admin.projects.update', $project) }}">
        @csrf
        @method('PUT')
        @include('admin.projects._form', ['project' => $project])
        <button type="submit" class="btn btn-primary">Save changes</button>
    </form>
</div>
@endsection
