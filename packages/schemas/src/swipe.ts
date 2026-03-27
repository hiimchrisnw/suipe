import { z } from "zod"

export const swipeSchema = z.object({
  id: z.string().uuid(),
  imageUrl: z.string(),
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
    sourceUrl: true,
    description: true,
    tags: true,
  })
  .partial({
    sourceUrl: true,
    description: true,
    tags: true,
  })

export type InsertSwipe = z.infer<typeof insertSwipeSchema>
