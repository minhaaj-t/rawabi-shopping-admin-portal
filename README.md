# Rawabi Admin Portal (Core MVP)

Vite + React SPA for Rawabi Shopping ops.

## Run

```bash
# Terminal 1 — API
cd BACKEND
php artisan serve --host=127.0.0.1 --port=8000

# Terminal 2 — Admin
cd ADMIN-PORTAL
npm install
npm run dev
```

Open http://localhost:5173

## Env

Copy `.env.example` → `.env`:

```
VITE_API_URL=http://127.0.0.1:8000
```

Use an existing `ec_user` admin account from your local database to sign in. Do not commit passwords or test credentials.
