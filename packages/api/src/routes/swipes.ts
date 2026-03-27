import { desc, eq, like } from "drizzle-orm"
import { Hono } from "hono"
import { createDb, schema } from "../db"
import type { Bindings } from "../index"

const swipes = new Hono<{ Bindings: Bindings }>()
  .post("/upload", async (c) => {
    const body = await c.req.parseBody()
    const file = body.file
    if (!(file instanceof File)) {
      return c.json({ error: "Missing image file" }, 400)
    }

    const sourceUrl = body.source_url
    const description = body.description
    const tagsRaw = body.tags

    let tags: string[] = []
    if (typeof tagsRaw === "string") {
      const parsed: unknown = JSON.parse(tagsRaw)
      if (!Array.isArray(parsed) || !parsed.every((t) => typeof t === "string")) {
        return c.json({ error: "tags must be a JSON array of strings" }, 400)
      }
      tags = parsed as string[]
    }

    const ext = file.name.split(".").pop() ?? "bin"
    const key = `${crypto.randomUUID()}.${ext}`
    await c.env.ASSETS.put(key, file.stream(), {
      httpMetadata: { contentType: file.type },
    })

    const db = createDb(c.env.DB)
    const [swipe] = await db
      .insert(schema.swipes)
      .values({
        imageUrl: key,
        sourceUrl: typeof sourceUrl === "string" ? sourceUrl : null,
        description: typeof description === "string" ? description : null,
        tags: JSON.stringify(tags),
      })
      .returning()

    return c.json(
      {
        ...swipe,
        tags,
      },
      201,
    )
  })
  .get("/", async (c) => {
    const tag = c.req.query("tag")
    const db = createDb(c.env.DB)

    let query = db.select().from(schema.swipes).orderBy(desc(schema.swipes.createdAt)).$dynamic()

    if (tag) {
      query = query.where(like(schema.swipes.tags, `%${JSON.stringify(tag)}%`))
    }

    const rows = await query
    return c.json(
      rows.map((row) => ({
        ...row,
        tags: JSON.parse(row.tags) as string[],
      })),
    )
  })
  .get("/:id", async (c) => {
    const id = c.req.param("id")
    const db = createDb(c.env.DB)

    const [swipe] = await db.select().from(schema.swipes).where(eq(schema.swipes.id, id))

    if (!swipe) {
      return c.json({ error: "Swipe not found" }, 404)
    }

    return c.json({
      ...swipe,
      tags: JSON.parse(swipe.tags) as string[],
    })
  })

export { swipes }
