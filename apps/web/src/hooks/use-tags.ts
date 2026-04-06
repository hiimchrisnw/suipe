import { useQuery } from "@tanstack/react-query"

const PRESET_TAGS = [
  "Bold",
  "Calm",
  "Caring",
  "Celebratory",
  "Delightful",
  "Empathetic",
  "Energetic",
  "Exploratory",
  "Friendly",
  "Fun",
  "Honest",
  "Human",
  "Immersive",
  "Intimate",
  "Joyful",
  "Loving",
  "Mysterious",
  "Nostalgic",
  "Organic",
  "Playful",
  "Precise",
  "Quirky",
  "Silly",
  "Supportive",
  "Trustworthy",
  "Warm",
  "Witty",
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
