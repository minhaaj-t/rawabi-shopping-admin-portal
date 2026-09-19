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

## Login (local)

After Core MVP setup, local test user:

- Email: `subadmin1@rawabi.com`
- Password: `admin123` (md5 in `ec_user.password`)

## Env

Copy `.env.example` → `.env`:

```
VITE_API_URL=http://127.0.0.1:8000
```
# rawabi-shopping-admin-portal
