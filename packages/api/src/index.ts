// 2026-03-27
import { healthResponseSchema } from "@suipe/schemas"
import { Hono } from "hono"
import { cors } from "hono/cors"
import { requireAdminForWrites } from "./lib/admin-auth"
import { assets } from "./routes/assets"
import { favicons } from "./routes/favicons"
import { swipes } from "./routes/swipes"

export type Bindings = {
  DB: D1Database
  ASSETS: R2Bucket
  ANTHROPIC_API_KEY: string
  ADMIN_KEY?: string
}

const app = new Hono<{ Bindings: Bindings }>()

// Only sUIpe's own pages (production and its preview deploys) and local dev may call the API from
// a browser. The old rule matched any *.pages.dev site, which is anyone's Cloudflare Pages project.
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "https://suipe.pages.dev",
  /^https:\/\/[a-z0-9-]+\.suipe\.pages\.dev$/,
]

app.use(
  "*",
  cors({
    origin: (origin) =>
      ALLOWED_ORIGINS.some((o) => (typeof o === "string" ? o === origin : o.test(origin)))
        ? origin
        : "",
    allowHeaders: ["Content-Type", "X-Admin-Key"],
    allowMethods: ["GET", "HEAD", "POST", "PATCH", "DELETE", "OPTIONS"],
  }),
)

app.use("*", requireAdminForWrites)

const routes = app
  .get("/health", (c) =>
    c.json(healthResponseSchema.parse({ ok: true, uptime: performance.now() })),
  )
  // Behind the admin check like every write, so a 204 here means the key is right.
  .post("/admin/verify", (c) => c.body(null, 204))
  .route("/swipes", swipes)
  .route("/assets", assets)
  .route("/favicons", favicons)

export default app
export type AppType = typeof routes
