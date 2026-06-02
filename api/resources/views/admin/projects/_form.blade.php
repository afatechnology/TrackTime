<label>
    <span>Name</span>
    <input type="text" name="name" value="{{ old('name', $project->name ?? '') }}" required>
</label>
<label>
    <span>Description</span>
    <textarea name="description" rows="3">{{ old('description', $project->description ?? '') }}</textarea>
</label>
<label>
    <span>Color</span>
    <input type="color" name="color" value="{{ old('color', $project->color ?? '#3b82f6') }}" style="max-width: 80px; height: 40px;">
</label>
<label>
    <span>Client name</span>
    <input type="text" name="client_name" value="{{ old('client_name', $project->client_name ?? '') }}">
</label>
<label>
    <span>Hourly rate</span>
    <input type="number" name="hourly_rate" step="0.01" min="0" value="{{ old('hourly_rate', $project->hourly_rate ?? '') }}">
</label>
<label style="display: flex; align-items: center; gap: 0.5rem; max-width: none;">
    <input type="checkbox" name="is_shared" value="1" style="width: auto;" {{ old('is_shared', $project->is_shared ?? false) ? 'checked' : '' }}>
    <span style="margin: 0;">Shared across all users (syncs to desktop apps)</span>
</label>
<label style="display: flex; align-items: center; gap: 0.5rem; max-width: none;">
    <input type="checkbox" name="is_archived" value="1" style="width: auto;" {{ old('is_archived', $project->is_archived ?? false) ? 'checked' : '' }}>
    <span style="margin: 0;">Archived</span>
</label>
