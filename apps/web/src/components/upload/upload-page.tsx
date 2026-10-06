import { useRef, useState } from "react"
import { useCheckDuplicate } from "../../hooks/use-check-duplicate"
import { useFetchUrl } from "../../hooks/use-fetch-url"
import { useUpload } from "../../hooks/use-upload"
import { cropMobbinFromBottom } from "../../lib/crop-image"
import { FocalPicker } from "../common/focal-picker"
import { DropZone } from "./drop-zone"
import { TagInput } from "./tag-input"

interface FetchedMedia {
  url: string
  mimeType: string
  // The link that was pasted — the key for "have we already fetched this?".
  sourceUrl: string
  // What the site says the original post is, when it can say. Stored in preference to the pasted
  // link so a repost never gets recorded as the source.
  canonicalUrl?: string
  authorName?: string
  authorHandle?: string
  authorAvatarUrl?: string
  // Set when the API already pulled the file into R2, because the host refuses browser requests.
  // The preview plays that stored object and saving reuses it.
  assetKey?: string
}

const SIXTY_FPS_URL = "https://60fps.design/"

// Some hosts (X) 403 any request carrying a Referer, which a browser always sends. For those the
// API has already stored the file, so play that rather than the original URL.
function previewSrc(media: { url: string; assetKey?: string }): string {
  if (!media.assetKey) return media.url
  return `${import.meta.env.VITE_API_URL}/assets/${media.assetKey}`
}

export function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [fetchedMedia, setFetchedMedia] = useState<FetchedMedia | null>(null)
  const [sourceUrl, setSourceUrl] = useState("")
  const [description, setDescription] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [fromMobbin, setFromMobbin] = useState(false)
  const [designSpells, setDesignSpells] = useState(false)
  const [sixtyFps, setSixtyFps] = useState(false)
  const [cropError, setCropError] = useState<string | null>(null)
  const [focalX, setFocalX] = useState(50)
  const [focalY, setFocalY] = useState(50)
  const [duplicateMessage, setDuplicateMessage] = useState<string | null>(null)
  const upload = useUpload()
  const fetchUrl = useFetchUrl()
  const checkDuplicate = useCheckDuplicate()
  const checkedUrlRef = useRef<string | null>(null)

  // Flag a duplicate the moment a URL lands, rather than after the user fills the rest in.
  async function runDuplicateCheck(params: { sourceUrl?: string; mediaUrl?: string }) {
    try {
      const result = await checkDuplicate.mutateAsync(params)
      setDuplicateMessage(result.duplicate ? "This has already been saved" : null)
    } catch {
      // A failing check shouldn't block the form; handleSubmit checks again before saving.
      setDuplicateMessage(null)
    }
  }

  const preview = file ? URL.createObjectURL(file) : fetchedMedia ? previewSrc(fetchedMedia) : null
  const isVideo = file
    ? file.type.startsWith("video/")
    : (fetchedMedia?.mimeType.startsWith("video/") ?? false)

  function handleFileSelect(selected: File) {
    setFile(selected)
    setCropError(null)
    setFocalX(50)
    setFocalY(50)
  }

  function handleMobbinChange(checked: boolean) {
    setFromMobbin(checked)
    if (checked) {
      setDesignSpells(false)
      setSixtyFps(false)
    }
  }

  function handleDesignSpellsChange(checked: boolean) {
    setDesignSpells(checked)
    if (checked) {
      setFromMobbin(false)
      setSixtyFps(false)
      setFile(null)
    }
  }

  function handleSixtyFpsChange(checked: boolean) {
    setSixtyFps(checked)
    if (checked) {
      setFromMobbin(false)
      setDesignSpells(false)
    }
  }

  function handleSourceUrlFetch(override?: string) {
    const url = (override ?? sourceUrl).trim()
    if (!url) {
      setFetchedMedia(null)
      setDuplicateMessage(null)
      checkedUrlRef.current = null
      return
    }
    if (file) return
    if (checkedUrlRef.current !== url) {
      checkedUrlRef.current = url
      void runDuplicateCheck({ sourceUrl: url })
    }
    if (fetchedMedia?.sourceUrl === url) return
    if (fetchUrl.isPending) return

    fetchUrl.mutate(url, {
      onSuccess: (result) => {
        setFetchedMedia({
          url: result.url,
          mimeType: result.mimeType,
          sourceUrl: url,
          ...(result.sourceUrl ? { canonicalUrl: result.sourceUrl } : {}),
          ...(result.authorName ? { authorName: result.authorName } : {}),
          ...(result.authorHandle ? { authorHandle: result.authorHandle } : {}),
          ...(result.authorAvatarUrl ? { authorAvatarUrl: result.authorAvatarUrl } : {}),
          ...(result.assetKey ? { assetKey: result.assetKey } : {}),
        })
        setFocalX(50)
        setFocalY(50)
        // The same media can sit behind a different page URL, so check what was fetched too.
        void runDuplicateCheck({ sourceUrl: url, mediaUrl: result.url })
      },
    })
  }

  // Fetch straight off the paste — waiting for blur/Enter makes the preview feel broken.
  function handleSourceUrlPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text")
    if (!pasted.trim()) return
    // Apply the paste ourselves so the fetched value matches what lands in the field.
    const input = e.currentTarget
    const start = input.selectionStart ?? input.value.length
    const end = input.selectionEnd ?? input.value.length
    const next = input.value.slice(0, start) + pasted + input.value.slice(end)
    e.preventDefault()
    setSourceUrl(next)
    handleSourceUrlFetch(next)
  }

  function handleSourceUrlKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault()
      handleSourceUrlFetch()
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setDuplicateMessage(null)

    const tagsList = tags.length > 0 ? tags : undefined
    const trimmedSource = sourceUrl.trim()
    const effectiveSource = sixtyFps
      ? SIXTY_FPS_URL
      : (fetchedMedia?.canonicalUrl ?? (trimmedSource || undefined))
    const credit = {
      authorName: fetchedMedia?.authorName,
      authorHandle: fetchedMedia?.authorHandle,
      authorAvatarUrl: fetchedMedia?.authorAvatarUrl,
    }
    const mediaUrlToCheck = !file ? fetchedMedia?.url : undefined

    if (trimmedSource || mediaUrlToCheck) {
      try {
        const result = await checkDuplicate.mutateAsync({
          sourceUrl: trimmedSource || undefined,
          mediaUrl: mediaUrlToCheck,
        })
        if (result.duplicate) {
          setDuplicateMessage("This has already been saved")
          return
        }
      } catch {
        setDuplicateMessage("Couldn't check for duplicates. Please try again.")
        return
      }
    }

    if (designSpells) {
      if (!trimmedSource) return

      let media = fetchedMedia
      if (!media || media.sourceUrl !== trimmedSource) {
        try {
          const result = await fetchUrl.mutateAsync(trimmedSource)
          media = {
            url: result.url,
            mimeType: result.mimeType,
            sourceUrl: trimmedSource,
            ...(result.sourceUrl ? { canonicalUrl: result.sourceUrl } : {}),
            ...(result.authorName ? { authorName: result.authorName } : {}),
            ...(result.authorHandle ? { authorHandle: result.authorHandle } : {}),
            ...(result.authorAvatarUrl ? { authorAvatarUrl: result.authorAvatarUrl } : {}),
            ...(result.assetKey ? { assetKey: result.assetKey } : {}),
          }
          setFetchedMedia(media)
        } catch {
          return
        }
      }

      upload.mutate({
        mediaUrl: media.url,
        sourceUrl: media.canonicalUrl ?? media.sourceUrl,
        authorName: media.authorName,
        authorHandle: media.authorHandle,
        authorAvatarUrl: media.authorAvatarUrl,
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
        sourceUrl: effectiveSource,
        ...credit,
        description: description || undefined,
        tags: tagsList,
        focalX,
        focalY,
      })
      return
    }

    if (fetchedMedia) {
      // Already in R2 from the paste, so record that object instead of fetching anything again.
      if (fetchedMedia.assetKey) {
        upload.mutate({
          assetKey: fetchedMedia.assetKey,
          mediaType: fetchedMedia.mimeType.startsWith("video/")
            ? "video"
            : fetchedMedia.mimeType === "image/gif"
              ? "gif"
              : "image",
          sourceUrl: effectiveSource,
          ...credit,
          description: description || undefined,
          tags: tagsList,
          focalX,
          focalY,
        })
        return
      }

      upload.mutate({
        imageUrl: fetchedMedia.url,
        mediaType: fetchedMedia.mimeType.startsWith("video/")
          ? "video"
          : fetchedMedia.mimeType === "image/gif"
            ? "gif"
            : "image",
        sourceUrl: effectiveSource,
        ...credit,
        description: description || undefined,
        tags: tagsList,
        focalX,
        focalY,
      })
    }
  }

  const canSubmit =
    (designSpells ? sourceUrl.trim().length > 0 : file !== null || fetchedMedia !== null) &&
    !upload.isPending &&
    !checkDuplicate.isPending &&
    duplicateMessage === null

  const urlLabel = designSpells ? "Design Spells URL" : "Source URL"
  const urlPlaceholder = designSpells
    ? "Paste a Design Spells page URL"
    : "Where is this from? (optional)"

  return (
    <div className="mx-auto max-w-xl space-y-3 p-4 md:max-w-5xl md:space-y-6 md:p-6 lg:max-w-6xl xl:max-w-[1500px]">
      <h1 className="text-base font-normal">Upload a swipe</h1>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-10">
        {/* flex rather than stacked spacing so the drop zone can take the height the trait list
            leaves over, instead of the column ending halfway down. */}
        <div className="flex flex-col gap-3 md:gap-4">
          {/* The drop zone shows the whole frame; the card beside it shows the square crop the
              grid will actually make, so the focal point can be placed against the real result
              rather than guessed. Desktop only — it needs the width. */}
          <div className="flex flex-1 gap-4">
            {designSpells ? (
              <div className="flex h-full min-h-48 w-full flex-1 items-center justify-center rounded-xl border-2 border-dashed border-gray-300">
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

            {preview && (
              <div className="hidden w-[220px] shrink-0 flex-col gap-1 lg:flex">
                <p className="text-base font-normal text-gray-700">Card preview</p>
                <div className="aspect-square w-full overflow-hidden rounded-[16px] bg-gray-100">
                  {isVideo ? (
                    <video
                      src={preview}
                      muted
                      autoPlay
                      loop
                      playsInline
                      style={{ objectPosition: `${focalX}% ${focalY}%` }}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <img
                      src={preview}
                      alt=""
                      style={{ objectPosition: `${focalX}% ${focalY}%` }}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          <div>
            <p className="mb-1 text-base font-normal text-gray-700">Source</p>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              <label className="flex items-center gap-2 text-base font-normal text-gray-700">
                <input
                  type="checkbox"
                  checked={fromMobbin}
                  onChange={(e) => handleMobbinChange(e.target.checked)}
                  className="h-4 w-4"
                />
                Mobbin
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
              <label className="flex items-center gap-2 text-base font-normal text-gray-700">
                <input
                  type="checkbox"
                  checked={sixtyFps}
                  onChange={(e) => handleSixtyFpsChange(e.target.checked)}
                  className="h-4 w-4"
                />
                60 FPS
              </label>
            </div>
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
              onChange={(e) => {
                setSourceUrl(e.target.value)
                setDuplicateMessage(null)
              }}
              onBlur={() => handleSourceUrlFetch()}
              onPaste={handleSourceUrlPaste}
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
          <TagInput tags={tags} onChange={setTags} />

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-lg bg-gray-900 px-4 py-2 text-base font-normal text-white disabled:opacity-50"
          >
            {checkDuplicate.isPending
              ? "Checking..."
              : upload.isPending
                ? "Uploading..."
                : "Upload"}
          </button>

          {duplicateMessage && (
            <p className="text-base font-normal text-red-600">{duplicateMessage}</p>
          )}
          {cropError && <p className="text-base font-normal text-red-600">{cropError}</p>}
          {upload.isError && (
            <p className="text-base font-normal text-red-600">Upload failed. Please try again.</p>
          )}
        </div>
      </form>
    </div>
  )
}
