import type { Swipe } from "@suipe/schemas"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { navigate } from "../lib/router"

interface UploadParams {
  file: File
  sourceUrl?: string | undefined
  description?: string | undefined
  tags?: string[] | undefined
}

export function useUpload() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: UploadParams): Promise<Swipe> => {
      const formData = new FormData()
      formData.append("file", params.file)
      if (params.sourceUrl) formData.append("source_url", params.sourceUrl)
      if (params.description) formData.append("description", params.description)
      if (params.tags && params.tags.length > 0) {
        formData.append("tags", JSON.stringify(params.tags))
      }

      const res = await fetch(`${import.meta.env.VITE_API_URL}/swipes/upload`, {
        method: "POST",
        body: formData,
      })
      if (!res.ok) throw new Error("Upload failed")
      return res.json() as Promise<Swipe>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["swipes"] })
      navigate("/")
    },
  })
}
