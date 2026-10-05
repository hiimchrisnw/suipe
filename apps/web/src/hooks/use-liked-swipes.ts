import type { Swipe } from "@suipe/schemas"
import { useQuery } from "@tanstack/react-query"

// The API caps how many ids it will take at once, so a long list goes in batches.
const BATCH = 100

async function fetchBatch(ids: string[]): Promise<Swipe[]> {
  const url = new URL("/swipes", import.meta.env.VITE_API_URL)
  url.searchParams.set("ids", ids.join(","))
  const res = await fetch(url)
  if (!res.ok) throw new Error("Failed to fetch saved swipes")
  return res.json() as Promise<Swipe[]>
}

export function useLikedSwipes(ids: string[]) {
  return useQuery({
    // Sorted so the key does not change when the same set is saved in a different order.
    queryKey: ["liked-swipes", [...ids].sort().join(",")] as const,
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
