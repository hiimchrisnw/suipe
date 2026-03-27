import { desc, eq, like } from "drizzle-orm"
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

function parseTags(raw: unknown): string[] | null {
  if (typeof raw !== "string") return []
  const parsed: unknown = JSON.parse(raw)
  if (!Array.isArray(parsed) || !parsed.every((t) => typeof t === "string")) return null
  return parsed as string[]
}

function deriveMediaType(mimeType: string): string {
  if (mimeType === "image/gif") return "gif"
  if (mimeType.startsWith("video/")) return "video"
  return "image"
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

    if (contentType.includes("application/json")) {
      const body = await c.req.json<{
        imageUrl?: string
        mediaType?: string
        sourceUrl?: string
        description?: string
        tags?: string[]
      }>()

      if (!body.imageUrl) {
        return c.json({ error: "Missing imageUrl" }, 400)
      }

      const [swipe] = await db
        .insert(schema.swipes)
        .values({
          imageUrl: body.imageUrl,
          mediaType: body.mediaType ?? "image",
          sourceType: "external",
          sourceUrl: body.sourceUrl ?? null,
          description: body.description ?? null,
          tags: JSON.stringify(body.tags ?? []),
        })
        .returning()

      return c.json({ ...swipe, tags: body.tags ?? [] }, 201)
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
      })
      .returning()

    return c.json({ ...swipe, tags }, 201)
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
    const tag = c.req.query("tag")
    const db = createDb(c.env.DB)

    let query = db.select().from(schema.swipes).orderBy(desc(schema.swipes.createdAt)).$dynamic()

    if (tag) {
      query = query.where(like(schema.swipes.tags, `%${JSON.stringify(tag)}%`))
    }

    const rows = await query
    return c.json(rows.map(parseRow))
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
