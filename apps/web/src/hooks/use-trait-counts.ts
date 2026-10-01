import { useQuery } from "@tanstack/react-query"

// How many swipes each trait would leave, given what the recipe already has.
export function useTraitCounts(tags?: string[]) {
  const tagKey = tags && tags.length > 0 ? tags.slice().sort().join(",") : null

  return useQuery({
    queryKey: ["trait-counts", tagKey] as const,
    queryFn: async (): Promise<Record<string, number>> => {
      const url = new URL("/swipes/trait-counts", import.meta.env.VITE_API_URL)
      if (tagKey) url.searchParams.set("tags", tagKey)
      const res = await fetch(url)
      if (!res.ok) throw new Error("Failed to fetch trait counts")
      return res.json() as Promise<Record<string, number>>
    },
    staleTime: 30_000,
  })
}
