# Recyclify Bidder Market CRM

Enterprise CRM SaaS for IT Asset Disposal & E-Waste Recycling — built for Recyclify (Vozon Comsof Pvt. Ltd.). Manages companies, buyers, recyclers, assets, bids and the full deal pipeline from lead to material collection.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at /api)
- `pnpm --filter @workspace/recyclify-crm run dev` — run the frontend (port 20617, proxied at /)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run seed` — re-seed the database with demo data
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — JWT signing secret

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- **Frontend**: React + Vite, Wouter routing, TailwindCSS, shadcn/ui, React Query, Recharts
- **API**: Express 5 on port 8080, served at `/api`
- **DB**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec) — generates React Query hooks and Zod schemas
- **Auth**: JWT stored in localStorage (`recyclify_token`, `recyclify_user`), injected by `custom-fetch.ts`
- **Build**: esbuild (CJS bundle)

## Where things live

- `artifacts/api-server/src/routes/` — all Express route handlers (auth, companies, pipeline, bids, etc.)
- `artifacts/api-server/src/seed.ts` — database seed script
- `artifacts/recyclify-crm/src/pages/` — all frontend pages
- `artifacts/recyclify-crm/src/components/` — layout, protected-route, shadcn ui components
- `artifacts/recyclify-crm/src/lib/auth.tsx` — AuthContext + useAuth hook
- `lib/api-client-react/src/custom-fetch.ts` — injects JWT from localStorage
- `lib/api-client-react/src/generated/api.ts` — all generated hooks (query + mutation)
- `lib/db/src/schema/index.ts` — Drizzle DB schema (source of truth)
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contract)

## Architecture decisions

- Contract-first API: OpenAPI spec → Orval codegen → typed React Query hooks. Never write fetch calls manually.
- Mutation hooks use `export const use*` pattern (not `export function`); query hooks always need `queryKey` in options.
- Query hooks that take an entity ID (e.g. `useGetCompany(id)`) receive a **number**, not a string.
- Mutation hooks that act on an entity ID include it in `.mutate({ id, data })`, NOT in the hook initialization.
- JWT auth is entirely frontend-managed — no cookie sessions. The `custom-fetch.ts` auto-injects the token.

## Product

- **Login / Forgot password** — email + password auth with JWT
- **Dashboard** — KPI cards (revenue, bids, tasks), charts, recent activity
- **Companies** — full CRUD, pipeline stage tracking, priority, contacts, notes, tasks, bids per company
- **Pipeline** — Kanban view across 13 stages from New Lead → Won/Lost
- **Buyers** — market buyers with ratings, material preferences, bid history, win rates
- **Recyclers** — CPCB-certified recyclers with capacity and certification tracking
- **Assets** — IT assets (laptops, servers, etc.) with condition, weight, quantity
- **Bids** — bid management with multi-buyer quotes, award workflow, bid history
- **Tasks** — task tracking with priority, due dates, calendar view
- **Calendar** — calendar view of tasks by due date
- **Activities** — real-time activity feed filterable by entity type
- **Reports** — pipeline, bids, buyers, and team performance analytics
- **Notifications** — in-app notifications with mark-read and unread filter
- **Admin Panel** — user management, audit logs, login logs, app settings (super_admin/admin only)
- **Settings / Profile** — edit profile, change password

## User preferences

- Primary brand color: #118847 (green)
- Super admin: harshjain@recyclify.in / Recyclify@2024
- Other seeded users: riya, arjun, sneha, raj, priya @recyclify.in / Recyclify@2024
- Indian locale: ₹ currency, en-IN number formatting

## Gotchas

- Always run `pnpm --filter @workspace/api-spec run codegen` after changing `openapi.yaml` before using new hooks.
- Orval query hooks require `queryKey` in the options object — TypeScript will error if omitted.
- Do NOT run `pnpm dev` at workspace root — use workflow names or `pnpm --filter` instead.
- `pnpm --filter @workspace/db run push` applies schema changes to the connected DB.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
