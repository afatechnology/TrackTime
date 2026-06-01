<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

class TimeEntry extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'project_id',
        'uuid',
        'started_at',
        'ended_at',
        'status',
        'notes',
        'task_title',
    ];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function segments(): HasMany
    {
        return $this->hasMany(TimeSegment::class);
    }

    public function totalSeconds(): int
    {
        $this->loadMissing('segments');

        return (int) $this->segments->sum(function (TimeSegment $segment) {
            $end = $segment->ended_at ?? ($this->status === 'running' ? now() : $segment->started_at);

            return $segment->started_at->diffInSeconds($end);
        });
    }

    public function scopeForUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopeInRange($query, Carbon $from, Carbon $to)
    {
        return $query->where(function ($q) use ($from, $to) {
            $q->whereBetween('started_at', [$from, $to])
                ->orWhereBetween('ended_at', [$from, $to])
                ->orWhere(function ($inner) use ($from, $to) {
                    $inner->where('started_at', '<=', $from)
                        ->where(function ($endQ) use ($to) {
                            $endQ->whereNull('ended_at')->orWhere('ended_at', '>=', $to);
                        });
                });
        });
    }
}
