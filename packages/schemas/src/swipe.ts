import { z } from "zod"

export const mediaTypeSchema = z.enum(["image", "gif", "video"])

export type MediaType = z.infer<typeof mediaTypeSchema>

export const sourceTypeSchema = z.enum(["upload", "external"])

export type SourceType = z.infer<typeof sourceTypeSchema>

export const swipeSchema = z.object({
  id: z.string().uuid(),
  imageUrl: z.string(),
  mediaType: mediaTypeSchema,
  sourceType: sourceTypeSchema,
  sourceUrl: z.string().nullable(),
  description: z.string().nullable(),
  tags: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Swipe = z.infer<typeof swipeSchema>

export const insertSwipeSchema = swipeSchema
  .pick({
    imageUrl: true,
    mediaType: true,
    sourceType: true,
    sourceUrl: true,
    description: true,
    tags: true,
  })
  .partial({
    mediaType: true,
    sourceType: true,
    sourceUrl: true,
    description: true,
    tags: true,
  })

export type InsertSwipe = z.infer<typeof insertSwipeSchema>
