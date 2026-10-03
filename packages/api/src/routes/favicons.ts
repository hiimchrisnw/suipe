import { Hono } from "hono"
import type { Bindings } from "../index"

const DOMAIN = /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/
const WEEK = 604800
const MAX_BYTES = 512 * 1024

interface IconLink {
  href: string
  rel: string
  size: number
  type: string
}

// Best first: a large touch icon reads well in a round avatar, then SVG (scales cleanly), then the
// biggest declared size, then anything else the page offers.
function rank(link: IconLink): number {
  if (link.rel.includes("apple-touch-icon")) return 3000 + link.size
  if (link.type === "image/svg+xml" || link.href.split("?")[0]?.endsWith(".svg")) return 2000
  return 1000 + link.size
}

async function readIconLinks(pageUrl: string): Promise<IconLink[]> {
  const res = await fetch(pageUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; suipe-favicon/1.0)" },
    redirect: "follow",
    cf: { cacheTtl: WEEK, cacheEverything: true },
  })
  if (!res.ok || !(res.headers.get("content-type") ?? "").includes("text/html")) return []

  const links: IconLink[] = []
  const base = res.url || pageUrl
  await new HTMLRewriter()
    .on("link[rel][href]", {
      element(el) {
        const rel = (el.getAttribute("rel") ?? "").toLowerCase()
        if (!rel.split(/\s+/).some((r) => r === "icon" || r.startsWith("apple-touch-icon"))) return
        const raw = el.getAttribute("href") ?? ""
        let href: string
        try {
          href = raw.startsWith("data:") ? raw : new URL(raw, base).toString()
        } catch {
          return
        }
        const size = Number.parseInt((el.getAttribute("sizes") ?? "").split("x")[0] ?? "", 10)
        links.push({
          href,
          rel,
          size: Number.isFinite(size) ? size : 0,
          type: (el.getAttribute("type") ?? "").toLowerCase(),
        })
      },
    })
    .transform(res)
    .arrayBuffer()
  return links.sort((a, b) => rank(b) - rank(a))
}

async function fetchImage(url: string): Promise<{ body: ArrayBuffer; type: string } | null> {
  if (url.startsWith("data:")) {
    const match = /^data:(image\/[\w.+-]+)(;base64)?,(.*)$/s.exec(url)
    if (!match?.[1] || match[3] === undefined) return null
    const text = match[2] ? atob(match[3]) : decodeURIComponent(match[3])
    return { body: Uint8Array.from(text, (ch) => ch.charCodeAt(0)).buffer, type: match[1] }
  }
  const res = await fetch(url, { cf: { cacheTtl: WEEK, cacheEverything: true } })
  const type = (res.headers.get("content-type") ?? "").split(";")[0]?.trim() ?? ""
  // Some servers label .ico files oddly; trust the extension for those.
  const isIco = url.split("?")[0]?.endsWith(".ico") ?? false
  if (!res.ok || !(type.startsWith("image/") || isIco)) return null
  const body = await res.arrayBuffer()
  if (body.byteLength === 0 || body.byteLength > MAX_BYTES) return null
  return { body, type: type.startsWith("image/") ? type : "image/x-icon" }
}

// Source favicons, read from the site itself (its declared icons, then /favicon.ico), with Google's
// favicon service only as a last resort. Fetched through the Worker so visitors' browsers never call
// a third party, and cached at the edge. Only a bare domain is accepted, so the route can't be used
// as a general proxy.
const favicons = new Hono<{ Bindings: Bindings }>().get("/:domain", async (c) => {
  const domain = c.req.param("domain").toLowerCase()
  if (!DOMAIN.test(domain)) return c.json({ error: "Invalid domain" }, 400)

  // ?debug lists what the site offered and which candidate won, for checking a wrong icon.
  const debug = c.req.query("debug") !== undefined
  // The DOM lib types CacheStorage without the Workers default cache, so it is asserted here.
  const cache = (caches as unknown as { default: Cache }).default
  const cached = debug ? undefined : await cache.match(c.req.raw)
  // Re-wrapped because cached responses have locked headers, and CORS still needs to add its own.
  if (cached) return new Response(cached.body, cached)

  const candidates: string[] = []
  try {
    for (const link of await readIconLinks(`https://${domain}/`)) candidates.push(link.href)
  } catch {
    // An unreachable homepage still leaves the fallbacks below.
  }
  candidates.push(`https://${domain}/favicon.ico`)
  candidates.push(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`)

  for (const candidate of candidates) {
    let image: Awaited<ReturnType<typeof fetchImage>> = null
    try {
      image = await fetchImage(candidate)
    } catch {
      continue
    }
    if (!image) continue
    if (debug) return c.json({ chosen: candidate, type: image.type, candidates })

    const response = new Response(image.body, {
      headers: {
        "Content-Type": image.type,
        "Cache-Control": `public, max-age=${WEEK}`,
        // An SVG icon served from our origin must not be able to run script if opened directly.
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
        "X-Content-Type-Options": "nosniff",
      },
    })
    c.executionCtx.waitUntil(cache.put(c.req.raw, response.clone()))
    return response
  }

  if (debug) return c.json({ chosen: null, candidates })
  // Nothing usable: the card drops the avatar instead of showing a placeholder.
  return c.body(null, 404)
})

export { favicons }
