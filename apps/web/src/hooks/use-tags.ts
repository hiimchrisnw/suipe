import { useQuery } from "@tanstack/react-query"

export const PRESET_TAGS = [
  "Calm",
  "Celebratory",
  "Confident",
  "Elegant",
  "Energetic",
  "Friendly",
  "Intimate",
  "Mysterious",
  "Nostalgic",
  "Playful",
  "Precise",
  "Quirky",
  "Rebellious",
  "Restrained",
  "Trustworthy",
  "Warm",
] as const

export function useTags() {
  return useQuery({
    queryKey: ["tags"] as const,
    queryFn: async (): Promise<string[]> => {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/swipes/tags`)
      if (!res.ok) throw new Error("Failed to fetch tags")
      const apiTags = (await res.json()) as string[]
      return [...new Set([...PRESET_TAGS, ...apiTags])].sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: "base" }),
      )
    },
    staleTime: 60_000,
  })
}
