# Fahad Al-Sharq Complaint System

## Stack
- **Next.js 15** (App Router) with React 19
- **NextAuth v5** (beta) — credentials provider, JWT strategy
- **Prisma 6** with `@prisma/extension-accelerate` — PostgreSQL (Supabase-hosted pooler)
- **Supabase** — file/image storage only (not auth)
- **Tailwind CSS v4** + shadcn/ui (Radix UI)
- **Zod** + **react-hook-form** for form validation
- **pdf-lib** for report generation
- **sonner** for toast notifications

## Commands

Package manager is **pnpm** (`pnpm install`, `pnpm add <pkg>`). Dependency install scripts must be allowed in `pnpm-workspace.yaml`.

```bash
pnpm dev           # Start dev server
pnpm build         # Production build (ESLint ignored during build)
pnpm lint          # Run ESLint
pnpm exec tsc --noEmit -p .   # Type-check
pnpm exec prisma generate      # Regenerate Prisma client (also runs on postinstall)
pnpm exec prisma migrate status
pnpm exec prisma migrate deploy   # Apply committed migrations
```

> **The only database is production.** There is no dev/staging DB.
> - Never run `prisma migrate dev`, `migrate reset`, `db push`, `db seed`, or
>   `migrate diff --shadow-database-url …` — they can wipe or overwrite live data
>   (a shadow-database diff against `DIRECT_URL` wiped it once).
> - Write migration SQL by hand under `prisma/migrations/<timestamp>_<name>/migration.sql`
>   (additive changes only), then `prisma migrate deploy`.

## Environment Variables

Required in `.env`:
```
DATABASE_URL=                          # Prisma Accelerate connection URL
DIRECT_URL=                            # Direct (non-pooled) DB URL (for migrations)
AUTH_SECRET=                           # NextAuth secret
NEXT_PUBLIC_SUPABASE_URL=              # Supabase project URL
NEXT_PRIVATE_SUPABASE_SECRET_DEFAULT_KEY=  # Supabase service role key (server only)
```

## Architecture

```
app/
  (auth)/
    login/                  # Login page + server action
    dashboard/
      admin/                # ADMIN role only (guarded in layout AND every page via withRole)
        buildings/          # Manage buildings
        complaint/[slug]/   # View/respond to a complaint
        complete/           # Completed complaints
        incomplete/         # Incomplete complaints
        pending/            # Pending complaints
        customers/          # Customer list
        employees/          # Employee management
        reports/            # PDF report generation
        inventory/          # Items, requests, transactions, usage reports
        hr/                 # Attendance, leave, salary summary (ADMIN + HR_MANAGER)
        employees/[slug]/   # HR profile tabs: hr, documents, penalties, handovers, letters, activity…
        components/         # Sidebar, header, logout
      employee/             # EMPLOYEE role only (+ inventory, leave, passport)
        complaint/[slug]/   # View/respond to a complaint
        complete/
        incomplete/
        pending/
        reports/
        components/
      inventory_manager/    # INVENTORY_MANAGER role only
      hr_manager/           # HR_MANAGER role only
      components/           # Shared dashboard components (data-table, AssignmentForm, etc.)
  complain/                 # Public complaint submission form
  private-complain/         # Private complaint submission form
  api/
    buildings/route.ts      # Buildings API endpoint
  generated/prisma/         # Prisma client output (do not edit)

lib/
  prisma.ts                 # Singleton Prisma client with Accelerate
  supabaseAdmin.ts          # Supabase admin client (server-side only)
  authz.ts                  # getActor / requireRole / requireHrAccess for server actions
  page-guard.tsx            # withRole(roles, Page) for dashboard pages
  dubai-time.ts             # Dubai-time formatting for server-rendered dates
  messages-ar.ts            # English→Arabic message dictionary (translateMessage)
  utils.ts                  # cn() utility

auth.ts                     # NextAuth config (root level)
prisma/schema.prisma        # DB schema
components/ui/              # shadcn/ui components
```

## Data Models (Key)

- **User** — roles: `ADMIN`, `EMPLOYEE`, `INVENTORY_MANAGER`, `HR_MANAGER`
- **Complaint** — has `isPrivate` flag; linked to building, assigned employee, responses, work times
- **ComplaintResponse** — employee/admin replies to a complaint
- **WorkTimes** — tracks when employees work on complaints; stores digital signatures (base64)
- **Buildings** — list of buildings with emirate
- **Inventory / InventoryTransaction / InventoryRequest** — inventory management for INVENTORY_MANAGER role

## Auth & Role Guarding

- Auth uses credentials (username + bcrypt password), **not** email/OAuth
- Session includes `id`, `role`, `username`
- Every exported function in a `"use server"` file is a public endpoint: start each action with
  `requireRole([...])` / `requireHrAccess()` from `lib/authz.ts`, and take "who is acting" from it —
  never from a client-supplied id. `requireRole` reads the role from the database (cached per
  request), so a deleted or demoted user loses access at once even though the JWT lives 30 days
- Layouts check the role, but layouts alone are bypassable — every dashboard page also exports
  `withRole([...], Page)` from `lib/page-guard.tsx`
- `NotAuthorized` component is returned (not redirect) when role check fails

## Gotchas

- **Prisma client output** is at `app/generated/prisma` (non-standard location) — import from there, not `@prisma/client`
- **Server Actions body size limit** is 5mb (set in next.config.ts) — needed for image uploads
- **Supabase is storage only** — images uploaded to Supabase bucket `koxptzqfmeasndsaecyo.supabase.co`
- `NEXT_PRIVATE_SUPABASE_SECRET_DEFAULT_KEY` must never be exposed to the client (server-only)
- The server runs in UTC — format server-rendered dates with `lib/dubai-time.ts`, not `toLocaleString()`
- pdf-lib uses Helvetica (WinAnsi): pass text through `toWinAnsi` (`lib/pdf-text.ts`) and check signatures with `isValidSignature` before `embedPng` (a corrupt PNG hangs pdf-lib)
- Stock changes must be atomic: conditional `updateMany` / transactions, compare with `QTY_EPSILON`
- ESLint errors are ignored during `next build` — fix them separately with `pnpm lint`
- The `(auth)` route group is a layout group only — it does not add `/auth` to the URL

## Code Style

- TypeScript throughout; prefer `lib/authz` over `(session.user as any).role` casts
- Server Actions in `actions.ts` files co-located with their route
- shadcn/ui components are in `components/ui/` — extend, don't replace
- Forms use Zod schemas + react-hook-form + `@hookform/resolvers`