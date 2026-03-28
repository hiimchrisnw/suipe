import { useRef, useState } from "react"
import { useFetchUrl } from "../../hooks/use-fetch-url"
import { useSuggestTags } from "../../hooks/use-suggest-tags"
import { useUpload } from "../../hooks/use-upload"
import { DropZone } from "./drop-zone"
import { TagInput } from "./tag-input"

export function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [fetchedMedia, setFetchedMedia] = useState<{
    url: string
    mimeType: string
  } | null>(null)
  const [fetchInput, setFetchInput] = useState("")
  const [sourceUrl, setSourceUrl] = useState("")
  const [description, setDescription] = useState("")
  const [tagsInput, setTagsInput] = useState("")
  const tagsEditedRef = useRef(false)
  const upload = useUpload()
  const suggestTags = useSuggestTags()
  const fetchUrl = useFetchUrl()

  const preview = file ? URL.createObjectURL(file) : (fetchedMedia?.url ?? null)
  const isVideo =
    file?.type.startsWith("video/") ?? fetchedMedia?.mimeType.startsWith("video/") ?? false

  function handleFileSelect(selected: File) {
    setFile(selected)
    setFetchedMedia(null)
    tagsEditedRef.current = false
    suggestTags.mutate(selected, {
      onSuccess: (tags) => {
        if (!tagsEditedRef.current && tags.length > 0) {
          setTagsInput(tags.join(", "))
        }
      },
    })
  }

  function handleFetchUrl() {
    const url = fetchInput.trim()
    if (!url) return

    fetchUrl.mutate(url, {
      onSuccess: (result) => {
        setFile(null)
        setFetchedMedia(result)
        setSourceUrl(url)
      },
    })
  }

  function handleFetchKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault()
      handleFetchUrl()
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)

    const tagsList = tags.length > 0 ? tags : undefined

    if (file) {
      upload.mutate({
        file,
        sourceUrl: sourceUrl || undefined,
        description: description || undefined,
        tags: tagsList,
      })
    } else if (fetchedMedia) {
      upload.mutate({
        imageUrl: fetchedMedia.url,
        mediaType: fetchedMedia.mimeType.startsWith("video/")
          ? "video"
          : fetchedMedia.mimeType === "image/gif"
            ? "gif"
            : "image",
        sourceUrl: sourceUrl || undefined,
        description: description || undefined,
        tags: tagsList,
      })
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 p-6">
      <h1 className="text-xl font-semibold">Upload a swipe</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="fetch-url"
            className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-700"
          >
            Fetch from URL
            {fetchUrl.isPending && (
              <span className="text-xs font-normal text-gray-400">Fetching...</span>
            )}
          </label>
          <input
            id="fetch-url"
            type="url"
            value={fetchInput}
            onChange={(e) => setFetchInput(e.target.value)}
            onBlur={handleFetchUrl}
            onKeyDown={handleFetchKeyDown}
            placeholder="Paste a URL to scrape an image..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
          />
          {fetchUrl.isError && (
            <p className="mt-1 text-xs text-red-600">{fetchUrl.error.message}</p>
          )}
        </div>

        <DropZone onFileSelect={handleFileSelect} preview={preview} isVideo={isVideo} />

        <div>
          <label htmlFor="description" className="mb-1 block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="What caught your eye?"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
          />
        </div>

        <TagInput
          value={tagsInput}
          onChange={(v) => {
            tagsEditedRef.current = true
            setTagsInput(v)
          }}
          isPending={suggestTags.isPending}
        />

        <button
          type="submit"
          disabled={(!file && !fetchedMedia) || upload.isPending}
          className="w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {upload.isPending ? "Uploading..." : "Upload"}
        </button>

        {upload.isError && <p className="text-sm text-red-600">Upload failed. Please try again.</p>}
      </form>
    </div>
  )
}
