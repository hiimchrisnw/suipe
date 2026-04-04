import type { Swipe } from "@suipe/schemas"
import { useInfiniteQuery } from "@tanstack/react-query"

const LIMIT = 30

export function useSwipes(tag?: string) {
  return useInfiniteQuery({
    queryKey: ["swipes", tag] as const,
    initialPageParam: 0,
    queryFn: async ({ pageParam }: { pageParam: number }): Promise<Swipe[]> => {
      const url = new URL("/swipes", import.meta.env.VITE_API_URL)
      if (tag) url.searchParams.set("tag", tag)
      url.searchParams.set("limit", String(LIMIT))
      url.searchParams.set("offset", String(pageParam))
      const res = await fetch(url)
      if (!res.ok) throw new Error("Failed to fetch swipes")
      return res.json() as Promise<Swipe[]>
    },
    getNextPageParam: (lastPage: Swipe[], allPages: Swipe[][]): number | undefined =>
      lastPage.length < LIMIT ? undefined : allPages.flat().length,
  })
}
