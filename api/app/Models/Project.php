<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Project extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'uuid',
        'name',
        'description',
        'color',
        'is_archived',
        'is_shared',
        'client_name',
        'hourly_rate',
    ];

    protected function casts(): array
    {
        return [
            'is_archived' => 'boolean',
            'is_shared' => 'boolean',
            'hourly_rate' => 'decimal:2',
        ];
    }

    public function scopeAccessibleBy($query, User $user)
    {
        return $query->where(function ($q) use ($user) {
            $q->where('user_id', $user->id)->orWhere('is_shared', true);
        });
    }

    public function isAccessibleBy(User $user): bool
    {
        return $this->is_shared || $this->user_id === $user->id;
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function timeEntries(): HasMany
    {
        return $this->hasMany(TimeEntry::class);
    }
}
