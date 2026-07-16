import { useMutation } from "@tanstack/react-query"

interface CheckDuplicateParams {
  sourceUrl?: string | undefined
  mediaUrl?: string | undefined
}

type CheckDuplicateResult = { duplicate: true; id: string } | { duplicate: false }

export function useCheckDuplicate() {
  return useMutation({
    mutationFn: async (params: CheckDuplicateParams): Promise<CheckDuplicateResult> => {
      const query = new URLSearchParams()
      if (params.sourceUrl) query.set("sourceUrl", params.sourceUrl)
      if (params.mediaUrl) query.set("mediaUrl", params.mediaUrl)

      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/swipes/check-duplicate?${query.toString()}`,
      )
      if (!res.ok) throw new Error("Failed to check for duplicate")
      return res.json() as Promise<CheckDuplicateResult>
    },
  })
}
