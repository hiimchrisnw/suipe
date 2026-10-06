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

// Shown beside each trait on the upload form, so tagging stays consistent over time rather than
// drifting with whatever the word suggests on the day. Partial on purpose: a trait with no note
// yet simply shows its name.
export const TRAIT_NOTES: Partial<Record<(typeof PRESET_TAGS)[number], string>> = {
  Playful: "Does unnecessary things for the fun of doing them.",
  Precise: "Exact and controlled, with nothing approximate about it.",
  Quirky: "Odd without purpose, strange and untroubled by being strange.",
  Rebellious: "Breaks convention knowingly and refuses what's expected.",
  Restrained: "Says only what's needed and stops there.",
  Trustworthy: "Steady and straight with you.",
  Warm: "Has a heart to it.",
}

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
