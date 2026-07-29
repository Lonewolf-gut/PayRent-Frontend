# PayRent Frontend

Next.js web application for PayRent — dashboards, admin panel, marketing pages, and authentication UI.

## Stack

- Next.js App Router
- TypeScript, Tailwind CSS, ShadCN UI
- TanStack Query
- NextAuth (browser sessions)

## Quick start

**Requires the backend API running** (default: http://localhost:3001).

```bash
npm run setup:env
npm install
npm run dev
```

Web UI runs at **http://localhost:3000**

## Environment

| Variable | Description |
|----------|-------------|
| `API_URL` | Backend URL for server-side proxy (e.g. `http://localhost:3001`) |
| `NEXT_PUBLIC_API_URL` | Optional: backend URL for client-side calls in production |
| `AUTH_SECRET` | Must match backend `AUTH_SECRET` |
| `AUTH_URL` | This app's URL (e.g. `http://localhost:3000`) |

## How it connects to the backend

- Most `/api/*` calls are proxied to the backend via Next.js rewrites
- Login uses `POST /api/auth/login` on the backend
- NextAuth session cookies stay on the frontend

## Related repo

- **Backend:** [PayRent-Backend](https://github.com/Lonewolf-gut/PayRent-Backend)

## Scripts

```bash
npm run dev          # Dev server on port 3000 (webpack — use this on Windows)
npm run dev:turbo    # Turbopack (Linux/Mac only, faster when native SWC works)
npm run build        # Production build
npm run start        # Start production server
```

## Local dev with backend

Terminal 1 (backend repo):

```bash
cd PayRent-Backend
docker compose up -d postgres redis
npm install && npm run db:push && npm run db:seed
npm run dev
```

Terminal 2 (this repo):

```bash
cd PayRent-Frontend
npm install
npm run dev
```
