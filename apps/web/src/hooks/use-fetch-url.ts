import { useMutation } from "@tanstack/react-query"
import { adminFetch } from "../lib/admin"

interface FetchUrlResult {
  url: string
  mimeType: string
  // Present when the site could name the original post, e.g. an X status rebuilt from its id.
  sourceUrl?: string
  authorName?: string
  authorHandle?: string
  authorAvatarUrl?: string
  rehostRequired?: boolean
  // Set when the API already pulled the file into R2; preview and save both use this.
  assetKey?: string
}

export function useFetchUrl() {
  return useMutation({
    mutationFn: async (url: string): Promise<FetchUrlResult> => {
      const res = await adminFetch(`${import.meta.env.VITE_API_URL}/swipes/fetch-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        throw new Error(data.error ?? "Failed to fetch URL")
      }
      return res.json() as Promise<FetchUrlResult>
    },
  })
}
