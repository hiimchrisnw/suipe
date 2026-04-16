import type { Swipe } from "@suipe/schemas"
import { ExternalLink, Trash2, X } from "lucide-react"
import { useCallback, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useDeleteSwipe } from "../../hooks/use-delete-swipe"
import { useTags } from "../../hooks/use-tags"
import { useUpdateSwipe } from "../../hooks/use-update-swipe"
import { getMediaUrl } from "../../lib/image-url"

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
  const url = getMediaUrl(swipe)

  const [showVideoControls, setShowVideoControls] = useState(false)
  const hasLeftVideoRef = useRef(false)

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 md:p-4"
      onClick={onClose}
      onKeyDown={handleBackdropKeyDown}
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: stopPropagation prevents modal close when clicking content */}
      <div
        className="flex h-[95vh] w-full max-w-3xl flex-col rounded-lg bg-white p-4 md:p-6"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="relative mb-3 shrink-0 space-y-3 md:mb-4">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-0 right-0 flex items-center justify-center rounded-lg border border-gray-200 p-1.5 text-gray-600 hover:border-gray-300 hover:text-gray-900 md:hidden"
          >
            <X size={14} />
          </button>
          {swipe.description && <p className="text-gray-700">{swipe.description}</p>}

          {/* Editable tag pills */}
          <div className="flex flex-wrap items-center gap-2 pr-10 md:pr-0">
            {tags.map((tag) => (
              <span
                key={tag}
                className="flex h-[34px] items-center gap-1 rounded-full bg-gray-100 px-4 text-base font-normal text-gray-600"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  aria-label={`Remove tag ${tag}`}
                  className="opacity-40 hover:opacity-70"
                >
                  ×
                </button>
              </span>
            ))}

            {/* Add tag dropdown */}
            <div ref={tagDropdownRef} className="static md:relative">
              <button
                type="button"
                onClick={() => {
                  setTagInputOpen(true)
                  setTagSearch("")
                  requestAnimationFrame(() => tagInputRef.current?.focus())
                }}
                className="flex h-[34px] items-center justify-center gap-1 rounded-full border border-dashed border-gray-300 px-4 text-base font-normal text-gray-400 hover:border-gray-400 hover:text-gray-600"
              >
                <span className="text-2xl font-extralight leading-[0]">+</span>
                <span>Add feeling</span>
              </button>
              {tagInputOpen && (
                <div className="absolute right-0 left-0 z-20 mt-1 rounded-lg border border-gray-200 bg-white shadow-lg md:right-auto md:w-64">
                  <div className="p-2">
                    <input
                      ref={tagInputRef}
                      type="text"
                      value={tagSearch}
                      onChange={(e) => setTagSearch(e.target.value)}
                      placeholder="Search feelings..."
                      onKeyDown={(e) => {
                        if (e.key === "Escape") setTagInputOpen(false)
                        if (e.key === "Enter") {
                          e.preventDefault()
                          const value = toTitleCase(tagSearch.trim())
                          if (value && !tags.includes(value)) handleAddTag(value)
                        }
                      }}
                      className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-base font-normal outline-none focus:border-gray-400"
                    />
                  </div>
                  <ul className="max-h-56 overflow-y-auto py-1">
                    {filteredTags.length === 0 ? (
                      <li className="px-3 py-2 text-base font-normal text-gray-400">
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
                            className="w-full px-3 py-1.5 text-left text-base font-normal hover:bg-gray-50"
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
          </div>
        </div>

        <div className="min-h-0 flex-1">
          {swipe.mediaType === "video" ? (
            <video
              src={url}
              controls={showVideoControls}
              muted
              autoPlay
              loop
              playsInline
              onMouseLeave={() => {
                hasLeftVideoRef.current = true
                setShowVideoControls(false)
              }}
              onMouseEnter={() => {
                if (hasLeftVideoRef.current) setShowVideoControls(true)
              }}
              className="h-full w-full rounded-lg object-contain"
            />
          ) : (
            <img
              src={url}
              alt={swipe.description ?? ""}
              className="h-full w-full rounded-lg object-contain"
            />
          )}
        </div>

        <div className="mt-4 flex shrink-0 items-center justify-between">
          {swipe.sourceUrl ? (
            <a
              href={swipe.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-base font-normal text-gray-600 hover:border-gray-300 hover:text-gray-900"
            >
              Source <ExternalLink size={14} className="relative -top-0.5 inline" />
            </a>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleteSwipe.isPending}
            className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-base font-normal text-red-600 hover:border-red-300 hover:bg-red-100"
          >
            <Trash2 size={14} />
            {deleteSwipe.isPending ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
