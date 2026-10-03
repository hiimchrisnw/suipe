import type { MiddlewareHandler } from "hono"
import type { Bindings } from "../index"

const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"])

// Compares every byte whatever the input, so response timing can't reveal how much of a guess
// was right.
function safeEqual(a: string, b: string): boolean {
  const left = new TextEncoder().encode(a)
  const right = new TextEncoder().encode(b)
  let diff = left.length ^ right.length
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0)
  }
  return diff === 0
}

// Reading is public. Anything that writes, deletes, fetches on our behalf or spends AI credit
// needs the admin key. With no key configured, writes are refused rather than left open.
export const requireAdminForWrites: MiddlewareHandler<{ Bindings: Bindings }> = async (c, next) => {
  if (READ_METHODS.has(c.req.method)) return next()

  const expected = c.env.ADMIN_KEY
  const provided = c.req.header("X-Admin-Key") ?? ""
  if (!expected || !safeEqual(provided, expected)) {
    return c.json({ error: "Unauthorized" }, 401)
  }
  return next()
}
