import { zValidator } from "@hono/zod-validator"
import { healthResponseSchema, z } from "@suipe/schemas"
import { Hono } from "hono"
import { swipes } from "./routes/swipes"

export type Bindings = {
  DB: D1Database
  ASSETS: R2Bucket
}

const app = new Hono<{ Bindings: Bindings }>()

const routes = app
  .get("/health", (c) =>
    c.json(healthResponseSchema.parse({ ok: true, uptime: performance.now() })),
  )
  .post("/echo", zValidator("json", z.object({ message: z.string() })), (c) => {
    const { message } = c.req.valid("json")
    return c.json({ reply: message })
  })
  .route("/swipes", swipes)

export default app
export type AppType = typeof routes
