import { sql } from "drizzle-orm"
import { real, sqliteTable, text } from "drizzle-orm/sqlite-core"

export const swipes = sqliteTable("swipes", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  imageUrl: text("image_url").notNull(),
  mediaType: text("media_type").notNull().default("image"),
  sourceType: text("source_type").notNull().default("upload"),
  sourceUrl: text("source_url"),
  description: text("description"),
  tags: text("tags").notNull().default("[]"),
  focalX: real("focal_x"),
  focalY: real("focal_y"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
})
