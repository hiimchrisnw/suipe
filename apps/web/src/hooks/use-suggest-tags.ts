import { useMutation } from "@tanstack/react-query"

export function useSuggestTags() {
  return useMutation({
    mutationFn: async (file: File): Promise<string[]> => {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch(`${import.meta.env.VITE_API_URL}/swipes/suggest-tags`, {
        method: "POST",
        body: formData,
      })
      if (!res.ok) return []
      const data = (await res.json()) as { tags: string[] }
      return data.tags
    },
  })
}
