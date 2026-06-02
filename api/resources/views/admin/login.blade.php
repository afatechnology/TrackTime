@extends('admin.layout')

@section('title', 'Login')

@section('content')
<div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 2rem;">
    <div class="card" style="width: 100%; max-width: 400px;">
        <h2 style="margin-top: 0; text-align: center;">TrackTime Admin</h2>
        <p style="color: var(--muted); text-align: center; margin-bottom: 1.5rem;">Sign in to manage users and reports</p>
        <form method="POST" action="{{ route('admin.login') }}">
            @csrf
            <label>
                <span>Email</span>
                <input type="email" name="email" value="{{ old('email') }}" required autofocus>
            </label>
            <label>
                <span>Password</span>
                <input type="password" name="password" required>
            </label>
            <label style="display: flex; align-items: center; gap: 0.5rem; max-width: none;">
                <input type="checkbox" name="remember" style="width: auto;">
                <span style="margin: 0;">Remember me</span>
            </label>
            <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 0.5rem;">Sign in</button>
        </form>
    </div>
</div>
@endsection
