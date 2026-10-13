import type { Swipe } from "@suipe/schemas"
import { ExternalLink, Trash2, X } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useDeleteSwipe } from "../../hooks/use-delete-swipe"
import { useTags } from "../../hooks/use-tags"
import { useUpdateSwipe } from "../../hooks/use-update-swipe"
import { useIsAdmin } from "../../lib/admin"
import { getAssetUrl, getFaviconUrl, getMediaUrl, getSourceDomain } from "../../lib/image-url"
import { FocalPicker } from "../common/focal-picker"

function toTitleCase(s: string) {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

interface SwipeModalProps {
  swipe: Swipe
  onClose: () => void
}

export function SwipeModal({ swipe, onClose }: SwipeModalProps) {
  const deleteSwipe = useDeleteSwipe()
  const updateSwipe = useUpdateSwipe()
  const isAdmin = useIsAdmin()
  const url = getMediaUrl(swipe)

  // One credit for the whole swipe. A person when we know one, otherwise the site it came from.
  // It points at the post itself, since that is what the old Source button opened; the profile is
  // only the fallback for a swipe credited to someone with no link to the thing.
  const sourceDomain = getSourceDomain(swipe.sourceUrl)
  const profileUrl = swipe.authorHandle
    ? `https://x.com/${swipe.authorHandle.replace(/^@/, "")}`
    : null
  const creditHref = swipe.sourceUrl ?? profileUrl
  const creditLabel = swipe.authorHandle ?? sourceDomain
  const creditAvatar = swipe.authorAvatar ? getAssetUrl(swipe.authorAvatar) : null
  const creditIcon = !creditAvatar && sourceDomain ? getFaviconUrl(sourceDomain) : null

  const panelRef = useRef<HTMLDivElement>(null)

  // legitimate-useeffect: the grid behind the modal is covered but still decoding video, which is
  // wasted work. Resume exactly what was playing, so cards that were already out of view stay
  // paused. The modal's own clip is excluded — it is the thing being looked at.
  useEffect(() => {
    const panel = panelRef.current
    const videos = [...document.querySelectorAll("video")].filter(
      (video) => !video.paused && !panel?.contains(video),
    )
    for (const video of videos) video.pause()

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = previousOverflow
      for (const video of videos) void video.play().catch(() => {})
    }
  }, [])

  const [showVideoControls, setShowVideoControls] = useState(false)
  const hasLeftVideoRef = useRef(false)

  const [focalX, setFocalX] = useState(swipe.focalX ?? 50)
  const [focalY, setFocalY] = useState(swipe.focalY ?? 50)
  const [imageAspect, setImageAspect] = useState<number>(1)

  const [tags, setTags] = useState(swipe.tags)
  const [tagSearch, setTagSearch] = useState("")
  const [tagInputOpen, setTagInputOpen] = useState(false)
  const tagInputRef = useRef<HTMLInputElement>(null)
  const { data: allTags } = useTags()

  const availableTags = (allTags ?? []).filter((t) => !tags.includes(t))
  const filteredTags =
    tagSearch.length > 0
      ? availableTags.filter((t) => t.toLowerCase().startsWith(tagSearch.toLowerCase()))
      : availableTags

  // React 19 callback ref cleanup — click-outside closes the tag dropdown
  const tagDropdownRef = useCallback((el: HTMLDivElement | null) => {
    if (!el) return
    const onMouseDown = (e: MouseEvent) => {
      if (!el.contains(e.target as Node)) setTagInputOpen(false)
    }
    document.addEventListener("mousedown", onMouseDown)
    return () => document.removeEventListener("mousedown", onMouseDown)
  }, [])

  function patchTags(next: string[]) {
    setTags(next)
    updateSwipe.mutate({ id: swipe.id, tags: next })
  }

  function handleRemoveTag(tag: string) {
    patchTags(tags.filter((t) => t !== tag))
  }

  function handleAddTag(tag: string) {
    patchTags([...tags, tag])
    setTagSearch("")
    requestAnimationFrame(() => tagInputRef.current?.focus())
  }

  const handleBackdropKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    },
    [onClose],
  )

  function handleDelete() {
    if (!confirm("Delete this swipe?")) return
    deleteSwipe.mutate(swipe.id, { onSuccess: onClose })
  }

  return createPortal(
    <div
      role="dialog"
      // dvh rather than inset alone: a fixed overlay is laid out against the full viewport, which
      // on mobile extends underneath the browser chrome.
      className="fixed inset-0 z-50 flex h-[100dvh] items-center justify-center bg-[var(--color-ink-veil)] p-2 md:p-4"
      onClick={onClose}
      onKeyDown={handleBackdropKeyDown}
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: stopPropagation prevents modal close when clicking content */}
      <div
        ref={panelRef}
        // One fixed size whatever the swipe is: the media pane takes the room left over and the
        // clip fits inside it, rather than the panel resizing itself around each file.
        className="flex h-[95dvh] max-h-full w-full max-w-3xl flex-col rounded-[16px] border border-rule bg-ink p-4 text-paper shadow-[0_24px_80px_rgba(0,0,0,0.55)] md:max-w-6xl md:p-6 xl:max-w-[1400px]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="relative mb-3 shrink-0 space-y-3 md:mb-4">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-0 right-0 flex items-center justify-center rounded-full border border-rule p-2 text-paper/70 hover:border-paper/40 hover:text-paper"
          >
            <X size={14} />
          </button>
          {swipe.description && <p className="text-paper/80">{swipe.description}</p>}

          {/* Editable tag pills */}
          <div className="flex flex-wrap items-center gap-2 pr-10">
            {tags.map((tag) => (
              <span
                key={tag}
                className="flex h-[34px] items-center gap-1 rounded-lg bg-paper/10 px-4 text-base font-normal text-paper/70"
              >
                {tag}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    aria-label={`Remove tag ${tag}`}
                    className="opacity-40 hover:opacity-70"
                  >
                    ×
                  </button>
                )}
              </span>
            ))}

            {/* Add tag dropdown */}
            {isAdmin && (
              <div ref={tagDropdownRef} className="static md:relative">
                <button
                  type="button"
                  onClick={() => {
                    setTagInputOpen(true)
                    setTagSearch("")
                    requestAnimationFrame(() => tagInputRef.current?.focus())
                  }}
                  // Swipes from before the cap can sit above it; removing traits unlocks this again.
                  className="flex h-[34px] items-center justify-center gap-1 rounded-lg border border-rule border-dashed px-4 text-base font-normal text-paper/40 hover:border-paper/40 hover:text-paper/70 disabled:opacity-40 disabled:hover:border-paper/40 disabled:hover:text-paper/70"
                >
                  <span className="text-2xl font-extralight leading-[0]">+</span>
                  <span>Add a trait</span>
                </button>
                {tagInputOpen && (
                  <div className="absolute right-0 left-0 z-20 mt-1 rounded-lg border border-rule bg-ink shadow-lg md:right-auto md:w-64">
                    <div className="p-2">
                      <input
                        ref={tagInputRef}
                        type="text"
                        value={tagSearch}
                        onChange={(e) => setTagSearch(e.target.value)}
                        placeholder="Search traits..."
                        onKeyDown={(e) => {
                          if (e.key === "Escape") setTagInputOpen(false)
                          if (e.key === "Enter") {
                            e.preventDefault()
                            const value = toTitleCase(tagSearch.trim())
                            if (value && !tags.includes(value)) handleAddTag(value)
                          }
                        }}
                        className="w-full rounded-lg border border-rule px-3 py-1.5 text-base font-normal outline-none focus:border-paper/40"
                      />
                    </div>
                    <ul className="max-h-56 overflow-y-auto py-1">
                      {filteredTags.length === 0 ? (
                        <li className="px-3 py-2 text-base font-normal text-paper/40">
                          Press Enter to add "{toTitleCase(tagSearch.trim())}"
                        </li>
                      ) : (
                        filteredTags.map((tag) => (
                          <li key={tag}>
                            {/* onMouseDown fires before document mousedown (click-outside),
                                so the tag is committed before the dropdown closes */}
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault()
                                handleAddTag(tag)
                              }}
                              className="w-full px-3 py-1.5 text-left text-base font-normal hover:bg-paper/10"
                            >
                              {tag}
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center">
          <div className="relative max-h-full max-w-full" style={{ aspectRatio: imageAspect }}>
            {swipe.mediaType === "video" ? (
              <video
                src={url}
                controls={showVideoControls}
                muted
                autoPlay
                loop
                playsInline
                onLoadedMetadata={(e) => {
                  const w = e.currentTarget.videoWidth
                  const h = e.currentTarget.videoHeight
                  if (w > 0 && h > 0) setImageAspect(w / h)
                }}
                onMouseLeave={() => {
                  hasLeftVideoRef.current = true
                  setShowVideoControls(false)
                }}
                onMouseEnter={() => {
                  if (hasLeftVideoRef.current) setShowVideoControls(true)
                }}
                style={{ objectPosition: `${focalX}% ${focalY}%` }}
                className="block h-full w-full rounded-lg object-contain"
              />
            ) : (
              <img
                src={url}
                alt={swipe.description ?? ""}
                onLoad={(e) => {
                  const w = e.currentTarget.naturalWidth
                  const h = e.currentTarget.naturalHeight
                  if (w > 0 && h > 0) setImageAspect(w / h)
                }}
                style={{ objectPosition: `${focalX}% ${focalY}%` }}
                className="block h-full w-full rounded-lg object-contain"
              />
            )}
            {isAdmin && (
              <FocalPicker
                x={focalX}
                y={focalY}
                onChange={(x, y) => {
                  setFocalX(x)
                  setFocalY(y)
                }}
                onDragEnd={(x, y) => updateSwipe.mutate({ id: swipe.id, focalX: x, focalY: y })}
              />
            )}
          </div>
        </div>

        <div className="mt-4 flex shrink-0 items-center justify-center gap-3">
          {/* One pill rather than a Source button beside a credit: the avatar sits in the ring of
              it, the handle reads next to it and the arrow says it leaves the site. "via", not
              "by" — this is whoever posted it, which is often not whoever made it. Where there is
              no person, the site's own mark and domain stand in. It points at the post itself,
              falling back to the profile when that is all we have. */}
          {creditHref && creditLabel && (
            <a
              href={creditHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 rounded-full border border-rule py-1 pr-4 pl-1 text-base font-normal text-paper/70 transition-colors hover:border-paper/40 hover:text-paper"
            >
              {creditAvatar ? (
                <img
                  src={creditAvatar}
                  alt=""
                  loading="lazy"
                  className="size-7 shrink-0 rounded-full object-cover ring-1 ring-paper/15"
                />
              ) : (
                <span className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-paper/15">
                  {creditIcon && (
                    <img
                      src={creditIcon}
                      alt=""
                      loading="lazy"
                      className="size-[18px] object-contain"
                    />
                  )}
                </span>
              )}
              <span>via {creditLabel}</span>
              <ExternalLink size={14} className="shrink-0 opacity-60" />
            </a>
          )}
          {isAdmin && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteSwipe.isPending}
              className="flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/10 px-4 py-2 text-base font-normal text-red-400 hover:border-red-500/60 hover:bg-red-500/20"
            >
              <Trash2 size={14} />
              {deleteSwipe.isPending ? "Deleting..." : "Delete"}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
