import type { Swipe } from "@suipe/schemas"
import { useQuery } from "@tanstack/react-query"

export function useSwipes(tag?: string) {
  return useQuery({
    queryKey: ["swipes", tag] as const,
    queryFn: async (): Promise<Swipe[]> => {
      const url = new URL("/swipes", import.meta.env.VITE_API_URL)
      if (tag) url.searchParams.set("tag", tag)
      const res = await fetch(url)
      if (!res.ok) throw new Error("Failed to fetch swipes")
      return res.json() as Promise<Swipe[]>
    },
  })
}
