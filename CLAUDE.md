# sUIpe — Claude Context

## Stack

### Runtime & Deploy
- **Cloudflare Pages** — hosts `apps/web` (static + edge)
- **Cloudflare Workers** — runs `packages/api` (Hono RPC)
- **Cloudflare D1** — SQLite-compatible relational DB (bound as `DB`)
- **Cloudflare R2** — object storage (bound as `BUCKET`)
- **Wrangler** — CLI for local dev and deployment

### Frontend (`apps/web`)
- React 19
- TanStack Query v5 — server state, caching
- Tailwind CSS v4 — utility-first styling via `@tailwindcss/vite` (no config file; configured in CSS)
- Vite 8 — dev server and bundler

### API (`packages/api`)
- Hono v4 — HTTP framework for Cloudflare Workers
- Hono RPC — exports `AppType` (not currently consumed by the web app; see Conventions)
- D1 + R2 bindings declared in `wrangler.toml`

### Shared
- `packages/schemas` — Zod schemas and TypeScript types shared between API and web
- `packages/ui` — shared React components (empty, ready to populate)

### Tooling
- **pnpm workspaces** — monorepo package management
- **TypeScript strict mode** — enabled across all packages (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`)
- **Biome** — linting and formatting (replaces ESLint + Prettier)
- **Knip** — dead code and unused exports detection

## Conventions

- All packages point directly to TypeScript source (`"exports": "./src/index.ts"`). No build step needed in other packages when consuming within the monorepo — Vite resolves TypeScript natively.
- `packages/api` still exports `AppType`, but **the web app no longer uses the typed Hono RPC
  client**. `apps/web/src/lib/api.ts` (the `hc<AppType>` client) went unused and has been
  deleted; the app now calls the API through `adminFetch` in `apps/web/src/lib/admin.ts`, which
  is plain `fetch` plus the `X-Admin-Key` header. Request and response types are hand-written at
  each call site, so end-to-end type safety is **not** currently enforced. Restoring it means
  reinstating that client and re-adding `@suipe/api` and `hono` to `apps/web`.
- `packages/schemas` re-exports Zod. Import `z` and shared types from `@suipe/schemas` rather than `zod` directly in app code.
- The `DB` wrangler binding ID in `packages/api/wrangler.toml` must be replaced with a real D1 database ID before deploying.
- Biome replaces ESLint and Prettier. Run `pnpm lint` and `pnpm format` from the root.
- Run `pnpm knip` from the root to detect dead code across all workspaces.

## Quality Checks

Typecheck and lint run automatically via a pre-commit hook. Run `pnpm knip` periodically to detect dead code — it is not automated.

## Auth & Access

### Admin key

Writes are locked; reads are not. `requireAdminForWrites` in `packages/api/src/lib/admin-auth.ts`
runs on every route: `GET`, `HEAD` and `OPTIONS` pass through, and `POST`, `PATCH` and `DELETE`
require an `X-Admin-Key` header matching the `ADMIN_KEY` Worker secret. The comparison is
constant-time. **With no secret configured, every write is refused** rather than left open, so an
unset key fails closed.

`POST /admin/verify` sits behind the same check and does nothing else — a `204` means the key is
correct.

> **Current state: `ADMIN_KEY` has never been set.** `wrangler secret list` returns `[]`, and a
> write against the deployed Worker answers `401`. All writes in production are refused until the
> secret is created with `wrangler secret put ADMIN_KEY --config packages/api/wrangler.toml`.

### Unlocking a device

The web app unlocks admin controls per device at `/admin`. The key is held in that browser's
`localStorage` under `suipe-admin-key` (`apps/web/src/lib/admin.ts`) and is **never committed to
code**. Unlocking one browser does not unlock any other.

### Local dev

Put the key in `packages/api/.dev.vars`:

```
ADMIN_KEY=
```

`.dev.vars` is gitignored (`.gitignore` line 4, matching at any depth) and must stay that way —
it is the only thing keeping real keys out of the repo.

### CORS

`ALLOWED_ORIGINS` in `packages/api/src/index.ts` admits exactly three things: `suipe.pages.dev`,
its preview subdomains (`^https://[a-z0-9-]+\.suipe\.pages\.dev$`) and `http://localhost:5173`.
The earlier rule matched any `*.pages.dev`, which is anyone's Cloudflare Pages project. **A custom
domain will be refused until it is added to that list.**

## Favicons

`GET /favicons/:domain` (`packages/api/src/routes/favicons.ts`) resolves a site's own icon,
normalises it and caches it at the edge. Only a bare domain is accepted, so the route cannot be
used as an open proxy.

Append `?debug` to see what the site offered and which candidate won — the response becomes JSON
(`chosen`, `type`, `candidates`) and bypasses the cache. Any value works, including none; `?debug=1`
and a bare `?debug` behave identically.

## CI/CD

GitHub Actions deploys automatically on push to `main`:
- **`deploy-api.yml`** — deploys `packages/api` to Cloudflare Workers (runs only when `packages/api/**` changes)
- **`deploy-web.yml`** — builds and deploys `apps/web` to Cloudflare Pages project "suipe" (runs only when `apps/web/**` changes)

### Required GitHub Secrets

Set these in the repo under **Settings → Secrets and variables → Actions**:

| Secret | Where to get it |
|--------|----------------|
| `CLOUDFLARE_API_TOKEN` | [Cloudflare dashboard → API Tokens](https://dash.cloudflare.com/profile/api-tokens) — create a token with **Workers** and **Pages** edit permissions |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard → any domain → **Overview** sidebar, or **Workers & Pages** overview |

## Deferred — Do Not Implement Until Ready

The following are planned but intentionally not installed or stubbed. Add them when the feature is actually being built.

| Item | Purpose | Notes |
|------|---------|-------|
| **Better Auth** | Authentication | Planned auth layer; choose between Better Auth and Clerk when auth work begins |
| **Framer Motion** | Animations | Add to `packages/ui` when UI animation work starts |
| **Durable Objects** | Stateful edge compute | Cloudflare Durable Objects for real-time or stateful features |
| **PartyKit** | Multiplayer / real-time | WebSocket-based collaboration layer |
| **Resend** | Transactional email | Add to `packages/api` when email flows are defined |
| **Fal.ai** | AI inference | Add to `packages/api` when AI features are scoped |
| **drizzle-orm** | D1 ORM | Add to `packages/api` once schema is defined and D1 ID is set |
| **React Router / TanStack Router** | Client-side routing | Add to `apps/web` once routes are defined |
| **@tanstack/react-query-devtools** | Dev tooling | Add to `apps/web` devDependencies when needed |

## Development Workflow

- **API:** `pnpm --filter @suipe/api dev -- --local` → `http://localhost:8787`
- **Web:** `pnpm --filter @suipe/web dev` → `http://localhost:5173`

## Git

Do not run git add, commit, or push unless explicitly instructed to do so.

