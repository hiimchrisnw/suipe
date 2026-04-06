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

  return (
    <div
      className="flex justify-center py-2"
      style={{ "--pill-bg": "white", "--pill-border": "#d1d5db" } as React.CSSProperties}
    >
      <div ref={containerRef} className="relative inline-flex items-center">
        {emotions.map((emotion, i) => (
          <div key={emotion} className="flex items-center">
            {i > 0 && (
              <div
                className="z-10 border-y border-[var(--pill-border)] bg-[var(--pill-bg)]"
                style={{ width: 5, height: 8, marginLeft: -1.5, marginRight: -1.5 }}
              />
            )}
            <button
              type="button"
              onClick={() => handleRemoveEmotion(emotion)}
              className="relative flex h-[34px] shrink-0 items-center gap-1.5 rounded-full border border-[var(--pill-border)] bg-[var(--pill-bg)] px-4 text-base font-normal text-gray-900 hover:border-gray-400"
              aria-label={`Remove ${emotion}`}
            >
              {emotion}
              <span aria-hidden="true" className="opacity-40">
                ×
              </span>
            </button>
          </div>
        ))}

        <div className="flex shrink-0 items-center">
          {emotions.length > 0 && (
            <div
              className="z-10 border-y border-[var(--pill-border)] bg-[var(--pill-bg)]"
              style={{ width: 5, height: 8, marginLeft: -1.5, marginRight: -1.5 }}
            />
          )}
          <button
            type="button"
            onClick={handleOpenDropdown}
            className={`flex items-center justify-center rounded-full border border-[var(--pill-border)] bg-[var(--pill-bg)] text-gray-500 hover:border-gray-600 hover:text-gray-700 ${emotions.length > 0 ? "h-[34px] w-[34px]" : "h-[34px] gap-1 border-dashed px-4 text-base font-normal"}`}
          >
            <span className="text-2xl font-extralight leading-[0]">+</span>
            {emotions.length === 0 && <span>Connect a feeling</span>}
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
                  className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-base font-normal outline-none focus:border-gray-400"
                />
              </div>
              <ul className="max-h-56 overflow-y-auto py-1">
                {filteredTags.length === 0 ? (
                  <li className="px-3 py-2 text-base font-normal text-gray-400">No matches</li>
                ) : (
                  filteredTags.map((tag) => (
                    <li key={tag}>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault()
                          handleSelectTag(tag)
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
  )
}
