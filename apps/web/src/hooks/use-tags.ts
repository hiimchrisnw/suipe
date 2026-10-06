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
// drifting with whatever the word suggests on the day. Total rather than partial: adding a trait
// without writing its note is a type error, which is the point.
export const TRAIT_NOTES: Record<(typeof PRESET_TAGS)[number], string> = {
  Calm: "Unhurried and quiet, with nothing pulling at your attention.",
  Celebratory: "Marks a moment and makes something of it.",
  Confident: "Sure of itself, with no need to explain or ask permission.",
  Elegant: "Graceful and refined, with a quality you notice in the finish.",
  Energetic: "Fast and full of motion, always moving forward.",
  Friendly: "Easy to approach and talks to you like a person.",
  Intimate: "Close and personal, as if it's speaking only to you.",
  Mysterious: "Holds something back and lets you find it.",
  Nostalgic: "Borrows from the past and makes you remember it fondly.",
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
