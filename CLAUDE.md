# Fahad Al-Sharq Complaint System

## Stack
- **Next.js 15** (App Router) with React 19
- **NextAuth v5** (beta) — credentials provider, JWT strategy
- **Prisma 6** with `@prisma/extension-accelerate` — PostgreSQL via Neon
- **Supabase** — file/image storage only (not auth)
- **Tailwind CSS v4** + shadcn/ui (Radix UI)
- **Zod** + **react-hook-form** for form validation
- **pdf-lib** for report generation
- **sonner** for toast notifications

## Commands

```bash
npm run dev        # Start dev server
npm run build      # Production build (ESLint ignored during build)
npm run lint       # Run ESLint
npx prisma migrate dev   # Run DB migrations
npx prisma generate      # Regenerate Prisma client (also runs on postinstall)
npx prisma db seed       # Seed database (uses tsx prisma/seed.ts)
npx prisma studio        # Open Prisma Studio
```

## Environment Variables

Required in `.env`:
```
DATABASE_URL=                          # Prisma Accelerate connection URL
DIRECT_URL=                            # Direct Neon DB URL (for migrations)
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
      admin/                # ADMIN role only (role-guarded in layout)
        buildings/          # Manage buildings
        complaint/[slug]/   # View/respond to a complaint
        complete/           # Completed complaints
        incomplete/         # Incomplete complaints
        pending/            # Pending complaints
        customers/          # Customer list
        employees/          # Employee management
        reports/            # PDF report generation
        components/         # Sidebar, header, logout
      employee/             # EMPLOYEE role only
        complaint/[slug]/   # View/respond to a complaint
        complete/
        incomplete/
        pending/
        reports/
        components/
      components/           # Shared dashboard components (data-table, AssignmentForm, etc.)
  complain/                 # Public complaint submission form
  private-complain/         # Private complaint submission form
  api/
    buildings/route.ts      # Buildings API endpoint
  generated/prisma/         # Prisma client output (do not edit)

lib/
  prisma.ts                 # Singleton Prisma client with Accelerate
  supabaseAdmin.ts          # Supabase admin client (server-side only)
  utils.ts                  # cn() utility

auth.ts                     # NextAuth config (root level)
prisma/schema.prisma        # DB schema
components/ui/              # shadcn/ui components
```

## Data Models (Key)

- **User** — roles: `ADMIN`, `EMPLOYEE`, `INVENTORY_MANAGER`
- **Complaint** — has `isPrivate` flag; linked to building, assigned employee, responses, work times
- **ComplaintResponse** — employee/admin replies to a complaint
- **WorkTimes** — tracks when employees work on complaints; stores digital signatures (base64)
- **Buildings** — list of buildings with emirate
- **Inventory / InventoryTransaction / InventoryRequest** — inventory management for INVENTORY_MANAGER role

## Auth & Role Guarding

- Auth uses credentials (username + bcrypt password), **not** email/OAuth
- Session includes `id`, `role`, `username` — access via `(session.user as any).role`
- Layout files guard routes: admin layout checks `role === "ADMIN"`, employee layout checks `role === "EMPLOYEE"`
- `NotAuthorized` component is returned (not redirect) when role check fails

## Gotchas

- **Prisma client output** is at `app/generated/prisma` (non-standard location) — import from there, not `@prisma/client`
- **Server Actions body size limit** is 5mb (set in next.config.ts) — needed for image uploads
- **Supabase is storage only** — images uploaded to Supabase bucket `koxptzqfmeasndsaecyo.supabase.co`
- `NEXT_PRIVATE_SUPABASE_SECRET_KEY` must never be exposed to the client (server-only)
- ESLint errors are ignored during `next build` — fix them separately with `npm run lint`
- The `(auth)` route group is a layout group only — it does not add `/auth` to the URL

## Code Style

- TypeScript throughout; `any` casts used on session user for role/username fields
- Server Actions in `actions.ts` files co-located with their route
- shadcn/ui components are in `components/ui/` — extend, don't replace
- Forms use Zod schemas + react-hook-form + `@hookform/resolvers`