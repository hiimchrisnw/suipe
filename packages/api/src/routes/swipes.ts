import { and, desc, eq, like } from "drizzle-orm"
import { Hono } from "hono"
import { createDb, schema } from "../db"
import type { Bindings } from "../index"
import { suggestTags } from "../lib/ai-tagging"
import { fetchUrlMedia } from "../lib/url-scraper"

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
}

function toSentenceCase(t: string): string {
  const s = t.trim().toLowerCase()
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function parseTags(raw: unknown): string[] | null {
  if (typeof raw !== "string") return []
  const parsed: unknown = JSON.parse(raw)
  if (!Array.isArray(parsed) || !parsed.every((t) => typeof t === "string")) return null
  return (parsed as string[]).map(toSentenceCase)
}

function deriveMediaType(mimeType: string): string {
  if (mimeType === "image/gif") return "gif"
  if (mimeType.startsWith("video/")) return "video"
  return "image"
}

function parseFocalCoord(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null
  const n = typeof raw === "number" ? raw : Number.parseFloat(String(raw))
  if (!Number.isFinite(n)) return null
  return Math.min(100, Math.max(0, n))
}

function parseRow(row: typeof schema.swipes.$inferSelect) {
  return {
    ...row,
    tags: JSON.parse(row.tags) as string[],
  }
}

const swipes = new Hono<{ Bindings: Bindings }>()
  .post("/fetch-url", async (c) => {
    const body = await c.req.json<{ url?: string }>()
    if (!body.url || typeof body.url !== "string") {
      return c.json({ error: "Missing url" }, 400)
    }

    try {
      const result = await fetchUrlMedia(body.url)
      return c.json(result)
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to fetch URL"
      return c.json({ error: message }, 422)
    }
  })
  .post("/suggest-tags", async (c) => {
    const body = await c.req.parseBody()
    const file = body.file
    if (!(file instanceof File)) {
      return c.json({ error: "Missing image file" }, 400)
    }

    if (file.type.startsWith("video/")) {
      return c.json({ tags: [] as string[] })
    }

    const buffer = await file.arrayBuffer()
    const base64 = arrayBufferToBase64(buffer)
    const tags = await suggestTags(base64, file.type, c.env.ANTHROPIC_API_KEY)

    return c.json({ tags })
  })
  .post("/upload", async (c) => {
    const contentType = c.req.header("content-type") ?? ""
    const db = createDb(c.env.DB)
    console.log("[/swipes/upload] content-type:", contentType)

    if (contentType.includes("application/json")) {
      const body = await c.req.json<{
        imageUrl?: string
        mediaUrl?: string
        mediaType?: string
        sourceUrl?: string
        description?: string
        tags?: string[]
        focalX?: number | null
        focalY?: number | null
      }>()
      console.log("[/swipes/upload] json body:", JSON.stringify(body))

      const normalizedTags = (body.tags ?? []).map(toSentenceCase)
      const focalX = parseFocalCoord(body.focalX)
      const focalY = parseFocalCoord(body.focalY)

      if (body.mediaUrl) {
        let res: Response
        try {
          res = await fetch(body.mediaUrl, {
            headers: { "User-Agent": "Mozilla/5.0 (compatible; Suipe/1.0)" },
          })
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          console.log("[/swipes/upload] mediaUrl fetch threw:", message)
          return c.json({ error: `Failed to fetch media URL: ${message}` }, 422)
        }
        if (!res.ok || !res.body) {
          console.log(
            "[/swipes/upload] mediaUrl fetch non-ok:",
            res.status,
            "content-type:",
            res.headers.get("content-type"),
          )
          return c.json({ error: `Failed to fetch media URL: ${res.status}` }, 422)
        }

        const fetchedContentType =
          res.headers.get("content-type")?.split(";")[0]?.trim() ?? "application/octet-stream"
        const pathname = (() => {
          try {
            return new URL(body.mediaUrl).pathname
          } catch {
            return ""
          }
        })()
        const urlExt = pathname.split(".").pop()?.toLowerCase()
        const mimeExt = fetchedContentType.split("/")[1]?.toLowerCase()
        const ext = urlExt && urlExt.length <= 5 ? urlExt : (mimeExt ?? "bin")
        const key = `${crypto.randomUUID()}.${ext}`

        await c.env.ASSETS.put(key, res.body, {
          httpMetadata: { contentType: fetchedContentType },
        })

        const [swipe] = await db
          .insert(schema.swipes)
          .values({
            imageUrl: key,
            mediaType: deriveMediaType(fetchedContentType),
            sourceType: "upload",
            sourceUrl: body.sourceUrl ?? null,
            description: body.description ?? null,
            tags: JSON.stringify(normalizedTags),
            focalX,
            focalY,
          })
          .returning()

        return c.json({ ...swipe, tags: normalizedTags }, 201)
      }

      if (!body.imageUrl) {
        return c.json({ error: "Missing imageUrl or mediaUrl" }, 400)
      }

      const [swipe] = await db
        .insert(schema.swipes)
        .values({
          imageUrl: body.imageUrl,
          mediaType: body.mediaType ?? "image",
          sourceType: "external",
          sourceUrl: body.sourceUrl ?? null,
          description: body.description ?? null,
          tags: JSON.stringify(normalizedTags),
          focalX,
          focalY,
        })
        .returning()

      return c.json({ ...swipe, tags: normalizedTags }, 201)
    }

    const body = await c.req.parseBody()
    const file = body.file
    if (!(file instanceof File)) {
      return c.json({ error: "Missing file" }, 400)
    }

    const tags = parseTags(body.tags)
    if (tags === null) {
      return c.json({ error: "tags must be a JSON array of strings" }, 400)
    }

    const ext = file.name.split(".").pop() ?? "bin"
    const key = `${crypto.randomUUID()}.${ext}`
    await c.env.ASSETS.put(key, file.stream(), {
      httpMetadata: { contentType: file.type },
    })

    const [swipe] = await db
      .insert(schema.swipes)
      .values({
        imageUrl: key,
        mediaType: deriveMediaType(file.type),
        sourceType: "upload",
        sourceUrl: typeof body.source_url === "string" ? body.source_url : null,
        description: typeof body.description === "string" ? body.description : null,
        tags: JSON.stringify(tags),
        focalX: parseFocalCoord(body.focal_x),
        focalY: parseFocalCoord(body.focal_y),
      })
      .returning()

    return c.json({ ...swipe, tags }, 201)
  })
  .patch("/:id", async (c) => {
    const id = c.req.param("id")
    const db = createDb(c.env.DB)

    const body = await c.req.json<{
      tags?: unknown
      focalX?: unknown
      focalY?: unknown
    }>()

    const patch: Partial<typeof schema.swipes.$inferInsert> = {}

    if (body.tags !== undefined) {
      if (
        !Array.isArray(body.tags) ||
        !body.tags.every((t): t is string => typeof t === "string")
      ) {
        return c.json({ error: "tags must be an array of strings" }, 400)
      }
      patch.tags = JSON.stringify(body.tags.map(toSentenceCase))
    }

    if (body.focalX !== undefined) patch.focalX = parseFocalCoord(body.focalX)
    if (body.focalY !== undefined) patch.focalY = parseFocalCoord(body.focalY)

    if (Object.keys(patch).length === 0) {
      return c.json({ error: "No updatable fields provided" }, 400)
    }

    const [updated] = await db
      .update(schema.swipes)
      .set(patch)
      .where(eq(schema.swipes.id, id))
      .returning()

    if (!updated) return c.json({ error: "Swipe not found" }, 404)

    return c.json(parseRow(updated))
  })
  .delete("/:id", async (c) => {
    const id = c.req.param("id")
    const db = createDb(c.env.DB)

    const [swipe] = await db.select().from(schema.swipes).where(eq(schema.swipes.id, id))
    if (!swipe) {
      return c.json({ error: "Swipe not found" }, 404)
    }

    if (swipe.sourceType === "upload") {
      await c.env.ASSETS.delete(swipe.imageUrl)
    }

    await db.delete(schema.swipes).where(eq(schema.swipes.id, id))
    return new Response(null, { status: 204 })
  })
  .get("/", async (c) => {
    const rawTags = c.req.query("tags")
    const tags: string[] = rawTags
      ? rawTags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : []
    const rawLimit = Number(c.req.query("limit") ?? "30")
    const rawOffset = Number(c.req.query("offset") ?? "0")
    const limit = Math.min(Math.max(1, Number.isFinite(rawLimit) ? rawLimit : 30), 100)
    const offset = Math.max(0, Number.isFinite(rawOffset) ? rawOffset : 0)
    const db = createDb(c.env.DB)

    let query = db
      .select()
      .from(schema.swipes)
      .orderBy(desc(schema.swipes.createdAt))
      .limit(limit)
      .offset(offset)
      .$dynamic()

    if (tags.length > 0) {
      query = query.where(
        and(...tags.map((tag) => like(schema.swipes.tags, `%${JSON.stringify(tag)}%`))),
      )
    }

    const rows = await query
    return c.json(rows.map(parseRow))
  })
  .get("/tags", async (c) => {
    const db = createDb(c.env.DB)
    const rows = await db.select({ tags: schema.swipes.tags }).from(schema.swipes)
    const tagSet = new Set<string>()
    for (const row of rows) {
      const parsed: unknown = JSON.parse(row.tags)
      if (Array.isArray(parsed)) {
        for (const t of parsed) {
          if (typeof t === "string" && t.length > 0) tagSet.add(t)
        }
      }
    }
    return c.json([...tagSet].sort())
  })
  .get("/:id", async (c) => {
    const id = c.req.param("id")
    const db = createDb(c.env.DB)

    const [swipe] = await db.select().from(schema.swipes).where(eq(schema.swipes.id, id))

    if (!swipe) {
      return c.json({ error: "Swipe not found" }, 404)
    }

    return c.json(parseRow(swipe))
  })

export { swipes }
