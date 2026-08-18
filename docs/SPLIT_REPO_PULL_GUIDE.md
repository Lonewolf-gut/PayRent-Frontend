# Split repo pull guide (PayRent-Frontend vs PayRent-Backend)

PayRent is split into two apps:

| Repo | Port | Role |
|------|------|------|
| **PayRent-Frontend** | 3000 | UI, NextAuth (`/api/auth/*`), proxies other `/api/*` to backend |
| **PayRent-Backend** | 3001 | Prisma, all business APIs, webhooks, cron |

## Fix: Frontend `npm run build` fails on Windows (standalone / `(marketing)`)

If the build compiles but fails at **Collecting build traces** with an `ENOENT` path under `app\(marketing)\`:

1. Pull the latest `next.config.ts` (standalone is skipped on Windows by default), **or**
2. Before building, run:
   ```powershell
   $env:NEXT_OUTPUT_STANDALONE="0"
   npm run build
   ```
3. For local work, use `npm run dev` — production build is not required.

Standalone output is still enabled on Linux/macOS CI for deployment. Force it on Windows with `NEXT_OUTPUT_STANDALONE=1` only if you deploy from Windows.

## Fix: `Cannot find module backend-api-url` on Frontend build

`next.config.ts` imports `lib/utils/backend-api-url.ts`. In a split Frontend repo, pull it from PayRent:

```powershell
git fetch payrent
git checkout payrent/cursor/demo-payments-financing-5e51 -- `
  lib/utils/backend-api-url.ts `
  lib/utils/internal-api-proxy.ts `
  proxy.ts `
  next.config.ts
```

## Fix: `@next/swc-win32-x64-msvc` is not a valid Win32 application

Corrupted or mismatched Next/SWC binaries. In **PayRent-Frontend**:

```powershell
npm run dev:fix
npm install
npm run build
```

Or reinstall matching versions (use the same major.minor as your `next` package):

```powershell
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
npm install
npm install next@16.2.6 @next/swc-win32-x64-msvc@16.2.6 --save-exact
npm run build
```

## Fix: `Module not found` on Frontend build

If `npm run build` in **PayRent-Frontend** fails with missing modules such as:

- `@/lib/api/handler`
- `@/lib/auth/jwt`
- `@/lib/repositories/property.repository`
- `@/lib/services/property-detail.service`
- `@/lib/integrations/documents`

those files belong on the **backend only**. Remove them from the frontend repo (or do not pull them):

```powershell
# In PayRent-Frontend — remove backend-only paths if they were pulled by mistake
git rm -r app/api/properties lib/services/property-detail.service.ts 2>$null
```

Then pull **frontend-safe** paths only (pages, components, constants, auth permissions).

## What goes where

**Frontend-safe**

- `app/(marketing)/**`
- `app/dashboard/**` (pages)
- `components/**`
- `lib/auth/permissions.ts`
- `lib/utils/backend-api-url.ts`
- `lib/utils/internal-api-proxy.ts`
- `proxy.ts`
- `next.config.ts`
- `constants/**`

**Backend-only**

- `app/api/**` (except NextAuth if frontend hosts auth)
- `lib/services/**`
- `lib/repositories/**`
- `lib/integrations/**`
- `prisma/**`

## Environment

**PayRent-Frontend `.env`**

```env
INTERNAL_API_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3001
AUTH_URL=http://localhost:3000
DATABASE_URL=<same as backend>
```

**PayRent-Backend `.env`**

```env
PORT=3001
PAYMENT_PROVIDER=demo
DEMO_MODE=true
DATABASE_URL=<same as frontend>
REDIS_URL=redis://localhost:6379
```

## Demo flows (backend)

Set on **PayRent-Backend** (or monorepo `.env`):

```env
PAYMENT_PROVIDER=demo
DEMO_MODE=true
```

Then:

1. **Subscriptions / listing checkout** — user is sent to `/payment/demo?reference=…`
2. **Affiliate withdrawals** — MoMo/bank payouts simulate success after OTP + 2FA
3. **Financing walkthrough** — admin → `/admin/financing/demo` → advance steps or run full demo

Demo accounts (after `npm run db:seed`): `tenant@payforme.com`, `landlord@payforme.com`, `lender@payforme.com`, `agent@payforme.com`, `admin@payforme.com` — password `Password123!`
