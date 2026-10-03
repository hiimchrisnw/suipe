import { Hono } from "hono"
import type { Bindings } from "../index"

const DOMAIN = /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/

// Source favicons, fetched through the Worker so visitors' browsers never call a third party and
// each icon is cached at the edge after the first request. Only a bare domain is accepted, so the
// route can't be turned into a general-purpose proxy.
const favicons = new Hono<{ Bindings: Bindings }>().get("/:domain", async (c) => {
  const domain = c.req.param("domain").toLowerCase()
  if (!DOMAIN.test(domain)) return c.json({ error: "Invalid domain" }, 400)

  const upstream = await fetch(
    `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`,
    { cf: { cacheTtl: 604800, cacheEverything: true } },
  )
  // Google answers an unknown site with a generic globe and a 404. Passing the 404 through lets
  // the card drop the avatar instead of showing a placeholder.
  if (!upstream.ok) return c.body(null, 404)

  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "image/png",
      "Cache-Control": "public, max-age=604800",
    },
  })
})

export { favicons }
