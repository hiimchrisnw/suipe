import { useEffect, useRef, useState } from "react"
import { useTags } from "../../hooks/use-tags"

interface TagInputProps {
  value: string
  onChange: (value: string) => void
  isPending: boolean
}

export function TagInput({ value, onChange, isPending }: TagInputProps) {
  const { data: allTags } = useTags()
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const prevFragmentRef = useRef("")

  const currentTagFragment = getCurrentFragment(value)
  const existingTags = new Set(
    value
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean),
  )

  const suggestions =
    currentTagFragment.length > 0 && allTags
      ? allTags.filter((t) => t.startsWith(currentTagFragment) && !existingTags.has(t))
      : []

  // Reset highlight when the typed fragment changes — computed during render, no effect needed
  if (prevFragmentRef.current !== currentTagFragment) {
    prevFragmentRef.current = currentTagFragment
    if (highlightIndex !== -1) setHighlightIndex(-1)
  }

  // legitimate-useeffect: subscribing to document mousedown for click-outside dismissal
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showSuggestions || suggestions.length === 0) return

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setHighlightIndex((i) => (i + 1) % suggestions.length)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlightIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1))
    } else if (e.key === "Enter" && highlightIndex >= 0) {
      e.preventDefault()
      const selected = suggestions[highlightIndex]
      if (selected) acceptSuggestion(selected)
    } else if (e.key === "Escape") {
      setShowSuggestions(false)
    }
  }

  function acceptSuggestion(tag: string) {
    const parts = value.split(",")
    parts[parts.length - 1] = ` ${tag}`
    onChange(`${parts.join(",").replace(/^[\s,]+/, "")}, `)
    setShowSuggestions(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <label
        htmlFor="tags"
        className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-700"
      >
        Tags
        {isPending && <span className="text-xs font-normal text-gray-400">Suggesting tags...</span>}
      </label>
      <input
        id="tags"
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setShowSuggestions(true)
        }}
        onFocus={() => setShowSuggestions(true)}
        onKeyDown={handleKeyDown}
        placeholder="typography, color, layout"
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
        autoComplete="off"
      />
      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {suggestions.map((tag, i) => (
            <li key={tag}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => acceptSuggestion(tag)}
                className={`w-full px-3 py-1.5 text-left text-sm ${
                  i === highlightIndex ? "bg-gray-100 text-gray-900" : "text-gray-600"
                }`}
              >
                {tag}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function getCurrentFragment(value: string): string {
  const parts = value.split(",")
  return (parts[parts.length - 1] ?? "").trim().toLowerCase()
}
