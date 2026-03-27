export type { infer as Infer, ZodType } from "zod"
export { z } from "zod"

import { z } from "zod"

export const healthResponseSchema = z.object({
  ok: z.boolean(),
  uptime: z.number(),
})

export type { InsertSwipe, MediaType, Swipe } from "./swipe"
export { insertSwipeSchema, mediaTypeSchema, swipeSchema } from "./swipe"
