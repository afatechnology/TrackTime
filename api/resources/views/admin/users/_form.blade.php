<label>
    <span>Name</span>
    <input type="text" name="name" value="{{ old('name', $user->name ?? '') }}" required>
</label>
<label>
    <span>Email</span>
    <input type="email" name="email" value="{{ old('email', $user->email ?? '') }}" required>
</label>
<label>
    <span>Password {{ isset($user) ? '(leave blank to keep)' : '' }}</span>
    <input type="password" name="password" {{ isset($user) ? '' : 'required' }}>
</label>
<label>
    <span>Confirm password</span>
    <input type="password" name="password_confirmation" {{ isset($user) ? '' : 'required' }}>
</label>
<label style="display: flex; align-items: center; gap: 0.5rem; max-width: none;">
    <input type="checkbox" name="is_admin" value="1" style="width: auto;" {{ old('is_admin', $user->is_admin ?? false) ? 'checked' : '' }}>
    <span style="margin: 0;">Administrator</span>
</label>
