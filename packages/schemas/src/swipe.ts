import { z } from "zod"

// How many traits a recipe can combine. A swipe itself is uncapped: tag it with as much as is
// true, and the filter stays legible by only ever asking for three at once.
export const MAX_RECIPE_TRAITS = 3

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
  authorName: z.string().nullable(),
  authorHandle: z.string().nullable(),
  authorAvatar: z.string().nullable(),
  description: z.string().nullable(),
  tags: z.array(z.string()),
  focalX: z.number().nullable(),
  focalY: z.number().nullable(),
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
    authorName: true,
    authorHandle: true,
    authorAvatar: true,
    description: true,
    tags: true,
    focalX: true,
    focalY: true,
  })
  .partial({
    mediaType: true,
    sourceType: true,
    sourceUrl: true,
    authorName: true,
    authorHandle: true,
    authorAvatar: true,
    description: true,
    tags: true,
    focalX: true,
    focalY: true,
  })

export type InsertSwipe = z.infer<typeof insertSwipeSchema>
