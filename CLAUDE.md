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
- Hono client (`hc`) — typed RPC calls to `packages/api`

### API (`packages/api`)
- Hono v4 — HTTP framework for Cloudflare Workers
- Hono RPC — exports `AppType` for end-to-end type safety with the web client
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
- `packages/api` exports `AppType` for use with `hono/client` in `apps/web/src/lib/api.ts`.
- `packages/schemas` re-exports Zod. Import `z` and shared types from `@suipe/schemas` rather than `zod` directly in app code.
- The `DB` wrangler binding ID in `packages/api/wrangler.toml` must be replaced with a real D1 database ID before deploying.
- Biome replaces ESLint and Prettier. Run `pnpm lint` and `pnpm format` from the root.
- Run `pnpm knip` from the root to detect dead code across all workspaces.

## Quality Checks

Typecheck and lint run automatically via a pre-commit hook. Run `pnpm knip` periodically to detect dead code — it is not automated.

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
