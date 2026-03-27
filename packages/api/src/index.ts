import { zValidator } from "@hono/zod-validator"
import { healthResponseSchema, z } from "@suipe/schemas"
import { Hono } from "hono"
import { cors } from "hono/cors"
import { assets } from "./routes/assets"
import { swipes } from "./routes/swipes"

export type Bindings = {
  DB: D1Database
  ASSETS: R2Bucket
  ANTHROPIC_API_KEY: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.use("*", cors({ origin: "http://localhost:5173" }))

const routes = app
  .get("/health", (c) =>
    c.json(healthResponseSchema.parse({ ok: true, uptime: performance.now() })),
  )
  .post("/echo", zValidator("json", z.object({ message: z.string() })), (c) => {
    const { message } = c.req.valid("json")
    return c.json({ reply: message })
  })
  .route("/swipes", swipes)
  .route("/assets", assets)

export default app
export type AppType = typeof routes
