import type { Swipe } from "@suipe/schemas"
import { useQuery } from "@tanstack/react-query"

// Fetches specific swipes by id: the faves grid, and a swipe opened straight from a shared
// link before the grid has reached it. The API caps how many ids it takes at once, so a long
// list goes in batches.
const BATCH = 100

async function fetchBatch(ids: string[]): Promise<Swipe[]> {
  const url = new URL("/swipes", import.meta.env.VITE_API_URL)
  url.searchParams.set("ids", ids.join(","))
  const res = await fetch(url)
  if (!res.ok) throw new Error("Failed to fetch saved swipes")
  return res.json() as Promise<Swipe[]>
}

export function useSwipesByIds(ids: string[]) {
  return useQuery({
    // Sorted so the key does not change when the same set is saved in a different order.
    queryKey: ["swipes-by-ids", [...ids].sort().join(",")] as const,
    enabled: ids.length > 0,
    queryFn: async (): Promise<Swipe[]> => {
      const batches: string[][] = []
      for (let i = 0; i < ids.length; i += BATCH) batches.push(ids.slice(i, i + BATCH))
      const pages = await Promise.all(batches.map(fetchBatch))
      const bySwipeId = new Map(pages.flat().map((swipe) => [swipe.id, swipe]))
      // Back into save order, dropping anything that has since been deleted.
      return ids.map((id) => bySwipeId.get(id)).filter((s): s is Swipe => s !== undefined)
    },
  })
}
