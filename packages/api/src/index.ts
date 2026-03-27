import { Hono } from "hono"

export type Bindings = {
  DB: D1Database
  BUCKET: R2Bucket
}

const app = new Hono<{ Bindings: Bindings }>()

const routes = app.get("/", (c) => c.json({ ok: true }))

export default app
export type AppType = typeof routes
