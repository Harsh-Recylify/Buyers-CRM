# Recyclify Bidder Market CRM

Enterprise CRM for IT Asset Disposal & E-Waste Recycling. Manages companies, buyers, recyclers, assets, bids, tasks and the full deal pipeline from lead to material collection.

## Stack

- **Monorepo**: pnpm workspaces, Node.js 24, TypeScript
- **Frontend**: React + Vite, Wouter, TailwindCSS, shadcn/ui, React Query, Recharts (`artifacts/recyclify-crm`)
- **API**: Express 5, served under `/api` (`artifacts/api-server`)
- **Database**: PostgreSQL + Drizzle ORM (`lib/db`)
- **API contract**: OpenAPI spec (`lib/api-spec/openapi.yaml`) → Orval-generated React Query hooks (`lib/api-client-react`) and Zod schemas (`lib/api-zod`)
- **Auth**: JWT stored in localStorage, signed with `SESSION_SECRET`

## Prerequisites

- Node.js 24+
- pnpm 9+ (`npm install -g pnpm`)
- PostgreSQL 14+ (local install or Docker)

## Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Create your environment file
cp .env.example .env      # then fill in DATABASE_URL and SESSION_SECRET

# 3. Create the database schema
export DATABASE_URL=postgresql://user:password@localhost:5432/recyclify
pnpm --filter @workspace/db run push

# 4. (Optional) Seed demo data — creates the admin user and sample records
export SESSION_SECRET=your-long-random-secret
pnpm --filter @workspace/api-server run seed
```

Seeded login (if you ran the seed): `harshjain@recyclify.in` / `Recyclify@2024`

## Running locally

This is a pnpm **workspace** — there is no single `npm run dev` at the root. Run the two services in separate terminals:

**Terminal 1 — API server** (port 8080, serves `/api/*`):

```bash
export DATABASE_URL=postgresql://user:password@localhost:5432/recyclify
export SESSION_SECRET=your-long-random-secret
export PORT=8080
pnpm --filter @workspace/api-server run dev
```

**Terminal 2 — Frontend** (Vite dev server):

```bash
export PORT=3000
export BASE_PATH=/
pnpm --filter @workspace/recyclify-crm run dev
```

### One required tweak outside Replit

On Replit, a shared reverse proxy routed browser requests from the frontend to the API under the same origin. Outside Replit you need Vite to proxy `/api` to the API server. Add this to the `server` section of `artifacts/recyclify-crm/vite.config.ts`:

```ts
server: {
  // ...existing options...
  proxy: {
    "/api": "http://localhost:8080",
  },
},
```

Then open http://localhost:3000.

## Useful commands

```bash
pnpm run typecheck                                  # typecheck all packages
pnpm --filter @workspace/api-spec run codegen        # regen hooks/schemas after editing openapi.yaml
pnpm --filter @workspace/db run push                 # push schema changes to the DB
pnpm --filter @workspace/api-server run seed         # re-seed demo data
pnpm --filter @workspace/recyclify-crm run build     # production build of the frontend
pnpm --filter @workspace/api-server run build        # production build of the API
```

## Project layout

```
artifacts/
  api-server/       Express API (routes in src/routes/, seed in src/seed.ts)
  recyclify-crm/    React frontend (pages in src/pages/)
  mockup-sandbox/   Design preview sandbox (not needed in production; safe to delete)
lib/
  db/               Drizzle schema (source of truth) + push script
  api-spec/         OpenAPI spec + Orval codegen config
  api-client-react/ Generated React Query hooks + fetch wrapper (JWT injection)
  api-zod/          Generated Zod schemas used by the API for validation
scripts/            Utility scripts
```

## Replit-specific files (safe to ignore or delete outside Replit)

| File / folder | Purpose on Replit | Outside Replit |
|---|---|---|
| `.replit` | Replit run/deploy config | Delete or ignore |
| `.replitignore` | Replit sync ignore rules | Delete or ignore |
| `replit.md` | Project notes for Replit's AI agent | Keep as extra docs or delete |
| `.replit-artifact/` (inside each artifact) | Replit preview-proxy routing config | Delete or ignore |
| `@replit/vite-plugin-*` (in `vite.config.ts`) | Dev-only error overlay/banner; the cartographer & banner plugins only load when `REPL_ID` is set | Harmless to keep; remove the plugins and deps for a cleaner build |
| `scripts/post-merge.sh` | Replit agent post-merge hook | Delete or ignore |

## Environment variables

| Variable | Used by | Description |
|---|---|---|
| `DATABASE_URL` | API, db push, seed | PostgreSQL connection string |
| `SESSION_SECRET` | API, seed | JWT signing secret (any long random string) |
| `PORT` | API and frontend | Port each service listens on |
| `BASE_PATH` | Frontend | Base URL path for the app — use `/` locally |
