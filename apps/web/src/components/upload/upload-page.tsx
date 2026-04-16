import { useRef, useState } from "react"
import { useFetchUrl } from "../../hooks/use-fetch-url"
import { useSuggestTags } from "../../hooks/use-suggest-tags"
import { useUpload } from "../../hooks/use-upload"
import { cropMobbinFromBottom } from "../../lib/crop-image"
import { FocalPicker } from "../common/focal-picker"
import { DropZone } from "./drop-zone"
import { TagInput } from "./tag-input"

interface FetchedMedia {
  url: string
  mimeType: string
  sourceUrl: string
}

export function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [fetchedMedia, setFetchedMedia] = useState<FetchedMedia | null>(null)
  const [sourceUrl, setSourceUrl] = useState("")
  const [description, setDescription] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [fromMobbin, setFromMobbin] = useState(false)
  const [designSpells, setDesignSpells] = useState(false)
  const [cropError, setCropError] = useState<string | null>(null)
  const [focalX, setFocalX] = useState(50)
  const [focalY, setFocalY] = useState(50)
  const tagsEditedRef = useRef(false)
  const upload = useUpload()
  const suggestTags = useSuggestTags()
  const fetchUrl = useFetchUrl()

  const preview = file ? URL.createObjectURL(file) : (fetchedMedia?.url ?? null)
  const isVideo = file
    ? file.type.startsWith("video/")
    : (fetchedMedia?.mimeType.startsWith("video/") ?? false)

  function handleFileSelect(selected: File) {
    setFile(selected)
    setCropError(null)
    setFocalX(50)
    setFocalY(50)
    tagsEditedRef.current = false
    suggestTags.mutate(selected, {
      onSuccess: (suggested) => {
        if (!tagsEditedRef.current && suggested.length > 0) {
          setTags(suggested)
        }
      },
    })
  }

  function handleMobbinChange(checked: boolean) {
    setFromMobbin(checked)
    if (checked) setDesignSpells(false)
  }

  function handleDesignSpellsChange(checked: boolean) {
    setDesignSpells(checked)
    if (checked) {
      setFromMobbin(false)
      setFile(null)
    }
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
        setFocalX(50)
        setFocalY(50)
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
    const trimmedSource = sourceUrl.trim()

    if (designSpells) {
      if (!trimmedSource) return

      let media = fetchedMedia
      if (!media || media.sourceUrl !== trimmedSource) {
        try {
          const result = await fetchUrl.mutateAsync(trimmedSource)
          media = { url: result.url, mimeType: result.mimeType, sourceUrl: trimmedSource }
          setFetchedMedia(media)
        } catch {
          return
        }
      }

      upload.mutate({
        mediaUrl: media.url,
        sourceUrl: media.sourceUrl,
        description: description || undefined,
        tags: tagsList,
        focalX,
        focalY,
      })
      return
    }

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
        sourceUrl: trimmedSource || undefined,
        description: description || undefined,
        tags: tagsList,
        focalX,
        focalY,
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
        sourceUrl: trimmedSource || undefined,
        description: description || undefined,
        tags: tagsList,
        focalX,
        focalY,
      })
    }
  }

  const canSubmit =
    (designSpells ? sourceUrl.trim().length > 0 : file !== null || fetchedMedia !== null) &&
    !upload.isPending

  const urlLabel = designSpells ? "Design Spells URL" : "Source URL"
  const urlPlaceholder = designSpells
    ? "Paste a Design Spells page URL"
    : "Where is this from? (optional)"

  return (
    <div className="mx-auto max-w-xl space-y-3 p-4 md:max-w-4xl md:space-y-6 md:p-6">
      <h1 className="text-base font-normal">Upload a swipe</h1>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-10">
        <div className="space-y-3 md:space-y-4">
          {designSpells ? (
            <div className="flex min-h-48 w-full items-center justify-center rounded-xl border-2 border-dashed border-gray-300">
              {preview ? (
                <div className="relative inline-block">
                  {isVideo ? (
                    <video
                      src={preview}
                      muted
                      autoPlay
                      loop
                      className="block max-h-80 rounded-lg"
                    />
                  ) : (
                    <img src={preview} alt="Preview" className="block max-h-80 rounded-lg" />
                  )}
                  <FocalPicker
                    x={focalX}
                    y={focalY}
                    onChange={(x, y) => {
                      setFocalX(x)
                      setFocalY(y)
                    }}
                  />
                </div>
              ) : (
                <p className="text-base font-normal text-gray-400">
                  {fetchUrl.isPending ? "Fetching..." : "Paste a Design Spells URL to preview"}
                </p>
              )}
            </div>
          ) : (
            <DropZone
              onFileSelect={handleFileSelect}
              preview={preview}
              isVideo={isVideo}
              overlay={
                preview ? (
                  <FocalPicker
                    x={focalX}
                    y={focalY}
                    onChange={(x, y) => {
                      setFocalX(x)
                      setFocalY(y)
                    }}
                  />
                ) : undefined
              }
            />
          )}

          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <label className="flex items-center gap-2 text-base font-normal text-gray-700">
              <input
                type="checkbox"
                checked={fromMobbin}
                onChange={(e) => handleMobbinChange(e.target.checked)}
                className="h-4 w-4"
              />
              From Mobbin
            </label>
            <label className="flex items-center gap-2 text-base font-normal text-gray-700">
              <input
                type="checkbox"
                checked={designSpells}
                onChange={(e) => handleDesignSpellsChange(e.target.checked)}
                className="h-4 w-4"
              />
              Design Spells
            </label>
          </div>

          <div>
            <label
              htmlFor="source-url"
              className="mb-1 flex items-center gap-2 text-base font-normal text-gray-700"
            >
              {urlLabel}
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
              placeholder={urlPlaceholder}
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
        </div>

        <div className="space-y-3 md:space-y-4">
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
        </div>
      </form>
    </div>
  )
}
