import type { Swipe } from "@suipe/schemas"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { navigate } from "../lib/router"

interface FileUploadParams {
  file: File
  sourceUrl?: string | undefined
  description?: string | undefined
  tags?: string[] | undefined
  focalX?: number | undefined
  focalY?: number | undefined
}

interface UrlUploadParams {
  imageUrl: string
  mediaType?: string | undefined
  sourceUrl?: string | undefined
  description?: string | undefined
  tags?: string[] | undefined
  focalX?: number | undefined
  focalY?: number | undefined
}

interface MediaFetchUploadParams {
  mediaUrl: string
  sourceUrl?: string | undefined
  description?: string | undefined
  tags?: string[] | undefined
  focalX?: number | undefined
  focalY?: number | undefined
}

export type UploadParams = FileUploadParams | UrlUploadParams | MediaFetchUploadParams

function isFileUpload(params: UploadParams): params is FileUploadParams {
  return "file" in params
}

function isMediaFetchUpload(params: UploadParams): params is MediaFetchUploadParams {
  return "mediaUrl" in params
}

export function useUpload() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: UploadParams): Promise<Swipe> => {
      let res: Response

      if (isFileUpload(params)) {
        const formData = new FormData()
        formData.append("file", params.file)
        if (params.sourceUrl) formData.append("source_url", params.sourceUrl)
        if (params.description) formData.append("description", params.description)
        if (params.tags && params.tags.length > 0) {
          formData.append("tags", JSON.stringify(params.tags))
        }
        if (params.focalX !== undefined) formData.append("focal_x", String(params.focalX))
        if (params.focalY !== undefined) formData.append("focal_y", String(params.focalY))
        res = await fetch(`${import.meta.env.VITE_API_URL}/swipes/upload`, {
          method: "POST",
          body: formData,
        })
      } else if (isMediaFetchUpload(params)) {
        res = await fetch(`${import.meta.env.VITE_API_URL}/swipes/upload`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mediaUrl: params.mediaUrl,
            sourceUrl: params.sourceUrl,
            description: params.description,
            tags: params.tags,
            focalX: params.focalX,
            focalY: params.focalY,
          }),
        })
      } else {
        res = await fetch(`${import.meta.env.VITE_API_URL}/swipes/upload`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl: params.imageUrl,
            mediaType: params.mediaType,
            sourceUrl: params.sourceUrl,
            description: params.description,
            tags: params.tags,
            focalX: params.focalX,
            focalY: params.focalY,
          }),
        })
      }

      if (!res.ok) throw new Error("Upload failed")
      return res.json() as Promise<Swipe>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["swipes"] })
      navigate("/")
    },
  })
}
