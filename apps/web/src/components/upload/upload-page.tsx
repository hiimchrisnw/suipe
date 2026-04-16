import { useRef, useState } from "react"
import { useFetchUrl } from "../../hooks/use-fetch-url"
import { useSuggestTags } from "../../hooks/use-suggest-tags"
import { useUpload } from "../../hooks/use-upload"
import { cropMobbinFromBottom } from "../../lib/crop-image"
import { DropZone } from "./drop-zone"
import { TagInput } from "./tag-input"

export function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [fetchedMedia, setFetchedMedia] = useState<{
    url: string
    mimeType: string
    sourceUrl: string
  } | null>(null)
  const [sourceUrl, setSourceUrl] = useState("")
  const [description, setDescription] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [fromMobbin, setFromMobbin] = useState(false)
  const [cropError, setCropError] = useState<string | null>(null)
  const tagsEditedRef = useRef(false)
  const upload = useUpload()
  const suggestTags = useSuggestTags()
  const fetchUrl = useFetchUrl()

  const preview = file ? URL.createObjectURL(file) : (fetchedMedia?.url ?? null)
  const isVideo =
    file?.type.startsWith("video/") ?? fetchedMedia?.mimeType.startsWith("video/") ?? false

  function handleFileSelect(selected: File) {
    setFile(selected)
    setCropError(null)
    tagsEditedRef.current = false
    suggestTags.mutate(selected, {
      onSuccess: (suggested) => {
        if (!tagsEditedRef.current && suggested.length > 0) {
          setTags(suggested)
        }
      },
    })
  }

  function handleSourceUrlFetch() {
    const url = sourceUrl.trim()
    if (!url) {
      setFetchedMedia(null)
      return
    }
    if (file) return
    if (fetchedMedia?.sourceUrl === url) return

    fetchUrl.mutate(url, {
      onSuccess: (result) => {
        setFetchedMedia({ url: result.url, mimeType: result.mimeType, sourceUrl: url })
      },
    })
  }

  function handleSourceUrlKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault()
      handleSourceUrlFetch()
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const tagsList = tags.length > 0 ? tags : undefined
    const trimmedSource = sourceUrl.trim() || undefined

    if (file) {
      const isImage = file.type.startsWith("image/")
      let payloadFile = file
      if (fromMobbin && isImage) {
        try {
          payloadFile = await cropMobbinFromBottom(file)
        } catch (err) {
          setCropError(err instanceof Error ? err.message : "Crop failed")
          return
        }
      }

      upload.mutate({
        file: payloadFile,
        sourceUrl: trimmedSource,
        description: description || undefined,
        tags: tagsList,
      })
      return
    }

    if (fetchedMedia) {
      upload.mutate({
        imageUrl: fetchedMedia.url,
        mediaType: fetchedMedia.mimeType.startsWith("video/")
          ? "video"
          : fetchedMedia.mimeType === "image/gif"
            ? "gif"
            : "image",
        sourceUrl: trimmedSource,
        description: description || undefined,
        tags: tagsList,
      })
    }
  }

  const canSubmit = (file !== null || fetchedMedia !== null) && !upload.isPending

  return (
    <div className="mx-auto max-w-xl space-y-3 p-4 md:space-y-6 md:p-6">
      <h1 className="text-base font-normal">Upload a swipe</h1>
      <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
        <DropZone onFileSelect={handleFileSelect} preview={preview} isVideo={isVideo} />

        <label className="flex items-center gap-2 text-base font-normal text-gray-700">
          <input
            type="checkbox"
            checked={fromMobbin}
            onChange={(e) => setFromMobbin(e.target.checked)}
            className="h-4 w-4"
          />
          From Mobbin
        </label>

        <div>
          <label
            htmlFor="source-url"
            className="mb-1 flex items-center gap-2 text-base font-normal text-gray-700"
          >
            Source URL
            {fetchUrl.isPending && (
              <span className="text-base font-normal text-gray-400">Fetching...</span>
            )}
          </label>
          <input
            id="source-url"
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            onBlur={handleSourceUrlFetch}
            onKeyDown={handleSourceUrlKeyDown}
            placeholder="Where is this from? (optional)"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base font-normal focus:border-gray-900 focus:outline-none"
          />
          {fetchUrl.isError && !file && (
            <p className="mt-1 text-base text-red-600">{fetchUrl.error.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="description" className="mb-1 block text-base font-normal text-gray-700">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="What caught your eye?"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base font-normal focus:border-gray-900 focus:outline-none"
          />
        </div>

        <TagInput
          tags={tags}
          onChange={(v) => {
            tagsEditedRef.current = true
            setTags(v)
          }}
          isPending={suggestTags.isPending}
        />

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-lg bg-gray-900 px-4 py-2 text-base font-normal text-white disabled:opacity-50"
        >
          {upload.isPending ? "Uploading..." : "Upload"}
        </button>

        {cropError && <p className="text-base font-normal text-red-600">{cropError}</p>}
        {upload.isError && (
          <p className="text-base font-normal text-red-600">Upload failed. Please try again.</p>
        )}
      </form>
    </div>
  )
}
