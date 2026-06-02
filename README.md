# TrackTime

Cross-platform project time tracking: **Electron desktop app** (Windows & macOS) + **Laravel API** with **MySQL** sync and login.

## Features

- **Projects** — name, color, client, optional hourly rate
- **Timer** — start, pause (breaks), resume, finish with start/end times
- **Notes** — task title and session notes (“what was done”)
- **Reports** — today, this week, this month, or custom date range
- **Offline-first** — local SQLite; sync when online
- **Auth** — login via Laravel Sanctum API tokens (accounts created by admin)
- **Admin panel** — web UI at `/admin` for users, shared projects, and org-wide reports
- **Manual time** — log forgotten sessions in the desktop app without starting a timer

## Repository layout

| Path | Description |
|------|-------------|
| `api/` | Laravel 13 REST API (MySQL in production) |
| `desktop/` | Electron + React desktop app |

## Quick start (development)

### 1. API (Laravel + MySQL)

```bash
cd api
cp .env.example .env
# Edit .env: DB_CONNECTION=mysql, DB_* credentials, APP_URL

composer install
php artisan key:generate
php artisan migrate
php artisan db:seed

php artisan serve     # http://localhost:8000
```

**Admin panel:** `http://localhost:8000/admin` — `admin@tracktime.app` / `password`

**Desktop API login:** `demo@tracktime.app` / `password`

API base URL for the desktop app: `http://localhost:8000/api/v1`

### 2. Desktop (Windows / Mac)

```bash
cd desktop
npm install
npm run dev
```

Configure the API URL on the login screen if needed.

### 3. Production builds

**API:** Deploy to your server (Apache/Nginx + PHP 8.2+), run migrations, set `APP_ENV=production`, configure MySQL.

**Desktop:**

```bash
cd desktop
npm run build:win    # Windows installer (NSIS)
npm run build:mac    # macOS DMG
```

Installers are output under `desktop/release/`.

## API overview

All routes are under `/api/v1` and require `Authorization: Bearer {token}` except login. Disabled users cannot access the API.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Get token |
| GET | `/projects` | List projects |
| POST | `/projects` | Create project |
| POST | `/time-entries/manual` | Log completed time (forgotten timer) |
| POST | `/time-entries/start` | Start timer |
| POST | `/time-entries/{id}/pause` | Pause |
| POST | `/time-entries/{id}/resume` | Resume |
| POST | `/time-entries/{id}/finish` | Complete session |
| GET | `/reports/summary?period=day\|week\|month\|custom` | Reports |
| GET/POST | `/sync/pull`, `/sync/push` | Desktop sync |

## MySQL setup (production)

In `api/.env`:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=tracktime
DB_USERNAME=your_user
DB_PASSWORD=your_password
```

```bash
php artisan migrate --force
```

## Admin panel

Open `/admin` after seeding. Administrators can:

- View dashboard stats and recent activity across all users
- Create, edit, enable/disable, and delete users
- Manage projects (mark as **shared** so they sync to every user's desktop app)
- Run organization-wide time reports filtered by user and date range

## Sync model

The desktop app stores data in SQLite (`%APPDATA%/TrackTime/tracktime.db` on Windows). On **Sync now**, it pushes unsynced rows to the API and pulls server changes since `last_sync_at`. **Shared projects** created in the admin panel are pulled to all users. UUIDs keep records consistent across devices.

## License

MIT
