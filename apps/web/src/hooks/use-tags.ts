import { useQuery } from "@tanstack/react-query"

export function useTags() {
  return useQuery({
    queryKey: ["tags"] as const,
    queryFn: async (): Promise<string[]> => {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/swipes/tags`)
      if (!res.ok) throw new Error("Failed to fetch tags")
      return res.json() as Promise<string[]>
    },
    staleTime: 60_000,
  })
}
