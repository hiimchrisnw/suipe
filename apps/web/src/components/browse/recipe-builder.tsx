import { useCallback, useRef, useState } from "react"
import { useTags } from "../../hooks/use-tags"
import { navigate } from "../../lib/router"

interface RecipeBuilderProps {
  emotions: string[]
}

function buildEmotionsUrl(next: string[]): string {
  const url = new URL(window.location.href)
  if (next.length === 0) {
    url.searchParams.delete("emotions")
  } else {
    url.searchParams.set("emotions", next.join(","))
  }
  return url.pathname + url.search
}

// Gap between adjacent pills and between the last pill and the "Add a feeling" button.
// A small positive gap exposes the dark blob layer between elements, making the gloopy
// connection visible. Overlap would hide the junction under the text layer's white bg.
const PILL_GAP = 5

export function RecipeBuilder({ emotions }: RecipeBuilderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState("")
  const { data: allTags } = useTags()
  const searchInputRef = useRef<HTMLInputElement>(null)

  const availableTags = (allTags ?? []).filter((t) => !emotions.includes(t))
  const filteredTags =
    search.length === 0
      ? availableTags
      : availableTags.filter((t) => t.toLowerCase().startsWith(search.toLowerCase()))

  // React 19 callback ref cleanup — click-outside closes the dropdown
  const containerRef = useCallback((el: HTMLDivElement | null) => {
    if (!el) return
    const onMouseDown = (e: MouseEvent) => {
      if (!el.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener("mousedown", onMouseDown)
    return () => document.removeEventListener("mousedown", onMouseDown)
  }, []) // setIsOpen from useState is stable

  function handleOpenDropdown() {
    setIsOpen(true)
    setSearch("")
    requestAnimationFrame(() => searchInputRef.current?.focus())
  }

  function handleSelectTag(tag: string) {
    navigate(buildEmotionsUrl([...emotions, tag]))
    requestAnimationFrame(() => searchInputRef.current?.focus())
  }

  function handleRemoveEmotion(tag: string) {
    navigate(buildEmotionsUrl(emotions.filter((e) => e !== tag)))
  }

  // Whether the button participates in the gloopy chain
  const buttonConnected = emotions.length > 0

  return (
    <div className="flex justify-center py-2">
      <div ref={containerRef} className="relative inline-flex items-center">
        {/* ── Gloopy blob layer ─────────────────────────────────────────────────
            Dark blobs at the same positions as the text-layer pills.
            The bg-white container provides the contrast needed for blur+contrast.
            The PILL_GAP between blobs exposes dark gloopy material between pills,
            making the connection visible above the white text-layer backgrounds.
            Earlier blobs have higher z-index so the left edge of each pill
            is covered by the preceding element (directional rightward gloop). */}
        {emotions.length > 0 && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center overflow-hidden bg-white"
            style={{ filter: "blur(8px) contrast(35)" }}
          >
            {emotions.map((emotion, i) => (
              <div
                key={emotion}
                className="shrink-0 rounded-full bg-gray-900 px-5 py-1.5 text-sm"
                style={{
                  marginLeft: i === 0 ? 0 : PILL_GAP,
                  color: "transparent",
                  position: "relative",
                  zIndex: emotions.length + 2 - i,
                }}
              >
                {/* Invisible text mirrors text layer for accurate blob sizing */}
                {emotion} ×
              </div>
            ))}
            {/* Button blob — participates in the gloopy chain */}
            <div
              className="shrink-0 rounded-full bg-gray-900 px-5 py-1.5 text-sm"
              style={{
                marginLeft: PILL_GAP,
                color: "transparent",
                position: "relative",
                zIndex: 1,
              }}
            >
              + Add a feeling
            </div>
          </div>
        )}

        {/* ── Text + interaction layer ─────────────────────────────────────────
            White-fill pills sit above the blob layer. Earlier pills have higher
            z-index so the preceding pill's white bg covers the left edge of
            the gap, creating a clean left cap on each pill. */}
        {emotions.map((emotion, i) => (
          <button
            key={emotion}
            type="button"
            onClick={() => handleRemoveEmotion(emotion)}
            className="relative flex shrink-0 items-center gap-1.5 rounded-full border border-gray-300 bg-white px-5 py-1.5 text-sm font-medium text-gray-900 hover:border-gray-400"
            style={{
              marginLeft: i === 0 ? 0 : PILL_GAP,
              zIndex: emotions.length + 2 - i,
            }}
            aria-label={`Remove ${emotion}`}
          >
            {emotion}
            <span aria-hidden="true" className="opacity-40">
              ×
            </span>
          </button>
        ))}

        {/* ── "Add a feeling" button + dropdown ───────────────────────────────── */}
        <div
          className="relative shrink-0"
          style={{
            marginLeft: buttonConnected ? PILL_GAP : 0,
            zIndex: 1,
          }}
        >
          <button
            type="button"
            onClick={handleOpenDropdown}
            className="rounded-full border border-dashed border-gray-400 bg-white px-5 py-1.5 text-sm text-gray-500 hover:border-gray-600 hover:text-gray-700"
          >
            + Add a feeling
          </button>

          {isOpen && (
            <div className="absolute top-full left-0 z-20 mt-2 w-64 rounded-xl border border-gray-200 bg-white shadow-lg">
              <div className="p-2">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search feelings..."
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setIsOpen(false)
                  }}
                  className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-gray-400"
                />
              </div>
              <ul className="max-h-56 overflow-y-auto py-1">
                {filteredTags.length === 0 ? (
                  <li className="px-3 py-2 text-sm text-gray-400">No matches</li>
                ) : (
                  filteredTags.map((tag) => (
                    <li key={tag}>
                      {/* onMouseDown fires before the document mousedown (click-outside)
                          listener, so the tag is committed before the dropdown closes */}
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault()
                          handleSelectTag(tag)
                        }}
                        className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
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
  )
}
