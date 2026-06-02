<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\SyncController;
use App\Http\Controllers\Api\TimeEntryController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::get('/auth/me', [AuthController::class, 'me']);

        Route::apiResource('projects', ProjectController::class);

        Route::get('/time-entries', [TimeEntryController::class, 'index']);
        Route::get('/time-entries/active', [TimeEntryController::class, 'active']);
        Route::post('/time-entries/start', [TimeEntryController::class, 'start']);
        Route::post('/time-entries/{timeEntry}/pause', [TimeEntryController::class, 'pause']);
        Route::post('/time-entries/{timeEntry}/resume', [TimeEntryController::class, 'resume']);
        Route::post('/time-entries/{timeEntry}/finish', [TimeEntryController::class, 'finish']);
        Route::patch('/time-entries/{timeEntry}', [TimeEntryController::class, 'update']);
        Route::delete('/time-entries/{timeEntry}', [TimeEntryController::class, 'destroy']);

        Route::get('/reports/summary', [ReportController::class, 'summary']);

        Route::get('/sync/pull', [SyncController::class, 'pull']);
        Route::post('/sync/push', [SyncController::class, 'push']);
    });
});
