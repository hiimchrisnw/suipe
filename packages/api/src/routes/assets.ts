import { Hono } from "hono"
import type { Bindings } from "../index"

const assets = new Hono<{ Bindings: Bindings }>().get("/:key", async (c) => {
  const key = c.req.param("key")
  const object = await c.env.ASSETS.get(key)

  if (!object) {
    return c.json({ error: "Not found" }, 404)
  }

  const contentType = object.httpMetadata?.contentType ?? "application/octet-stream"
  return new Response(object.body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  })
})

export { assets }
