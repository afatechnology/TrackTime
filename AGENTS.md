# TrackTime — agent notes

## Cursor Cloud specific instructions

### Repository branch

The full monorepo (`api/`, `desktop/`, `docker-compose.yml`) lives on `cursor/time-tracking-app-bf2d`. The default `main` branch may only contain a stub `README.md`; check out the feature branch before setup.

### Services (see root `README.md` for full quick start)

| Service | How to run | Notes |
|---------|------------|--------|
| **MySQL 8.4** | `sudo docker compose up -d mysql` from repo root | Credentials match `docker-compose.yml`: DB `tracktime`, user `tracktime`, password `secret`, port `3306` |
| **Laravel API** | `cd api && php artisan serve --host=0.0.0.0 --port=8000` | Requires PHP 8.3+ and `composer install`. Copy `api/.env.example` → `.env` and set `DB_*` to the Docker MySQL values above before `php artisan key:generate`, `migrate`, `db:seed` |
| **Desktop (Electron)** | `cd desktop && npm run dev` | Vite on `http://localhost:5173/`; Electron loads that URL in dev |

Demo API login: `demo@tracktime.app` / `password` (include `device_name` in JSON body).

### Desktop preload gotcha (dev)

`electron/main.ts` points preload at `dist-electron/preload.mjs`, but Vite builds `dist-electron/preload.js`. Until that is fixed in source, after the first `npm run dev` build run:

```bash
ln -sf preload.js /workspace/desktop/dist-electron/preload.mjs
```

Then restart `npm run dev`. Without this, the renderer shows a black screen (`window.tracktime` is undefined).

### Lint / test

| Area | Command | Notes |
|------|---------|--------|
| API tests | `cd api && php artisan test` | Uses SQLite in-memory; no MySQL required |
| API style | `cd api && ./vendor/bin/pint --test` | May report existing style drift |
| Desktop types | `cd desktop && npm run typecheck` | |

`composer test` in `api/composer.json` currently fails on `@no_additional_args`; use `php artisan test` instead.

### Cloud VM tooling

PHP 8.3, Composer, Docker, and Node (via nvm) are installed on the VM image used for Cloud Agents. MySQL is expected via Docker Compose, not a host-installed server.
