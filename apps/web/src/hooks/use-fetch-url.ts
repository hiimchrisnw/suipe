import { useMutation } from "@tanstack/react-query"

interface FetchUrlResult {
  url: string
  mimeType: string
}

export function useFetchUrl() {
  return useMutation({
    mutationFn: async (url: string): Promise<FetchUrlResult> => {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/swipes/fetch-url`, {
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
