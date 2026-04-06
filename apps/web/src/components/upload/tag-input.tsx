import { useCallback, useRef, useState } from "react"
import { useTags } from "../../hooks/use-tags"

function toTitleCase(s: string) {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  isPending: boolean
}

export function TagInput({ tags, onChange, isPending }: TagInputProps) {
  const { data: allTags } = useTags()
  const [search, setSearch] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const availableTags = (allTags ?? []).filter((t) => !tags.includes(t))
  const filteredTags =
    search.length > 0
      ? availableTags.filter((t) => t.toLowerCase().startsWith(search.toLowerCase()))
      : availableTags

  // React 19 callback ref cleanup — click-outside closes the dropdown
  const containerRef = useCallback((el: HTMLDivElement | null) => {
    if (!el) return
    const onMouseDown = (e: MouseEvent) => {
      if (!el.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener("mousedown", onMouseDown)
    return () => document.removeEventListener("mousedown", onMouseDown)
  }, [])

  function handleAddTag(tag: string) {
    onChange([...tags, tag])
    setSearch("")
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  function handleRemoveTag(tag: string) {
    onChange(tags.filter((t) => t !== tag))
  }

  return (
    <div ref={containerRef}>
      <span className="mb-1 flex items-center gap-2 text-base font-normal text-gray-700">
        Tags
        {isPending && (
          <span className="text-base font-normal text-gray-400">Suggesting tags...</span>
        )}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-full bg-gray-100 px-4 py-1.5 text-base font-normal text-gray-600"
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

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setIsOpen(true)
              setSearch("")
              requestAnimationFrame(() => inputRef.current?.focus())
            }}
            className="flex h-[34px] items-center justify-center gap-1 rounded-full border border-dashed border-gray-300 px-4 text-base font-normal text-gray-400 hover:border-gray-400 hover:text-gray-600"
          >
            <span className="relative -top-0.5 text-2xl font-extralight leading-[0]">+</span>
            <span>Add feeling</span>
          </button>
          {isOpen && (
            <div className="absolute top-full left-0 z-20 mt-1 w-48 rounded-xl border border-gray-200 bg-white shadow-lg">
              <div className="p-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search tags..."
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setIsOpen(false)
                    if (e.key === "Enter") {
                      e.preventDefault()
                      const value = toTitleCase(search.trim())
                      if (value && !tags.includes(value)) handleAddTag(value)
                    }
                  }}
                  className="w-full rounded-lg border border-gray-200 px-2 py-1 text-base font-normal outline-none focus:border-gray-400"
                />
              </div>
              <ul className="max-h-40 overflow-y-auto py-1">
                {filteredTags.length === 0 ? (
                  <li className="px-3 py-2 text-base font-normal text-gray-400">
                    Press Enter to add "{toTitleCase(search.trim())}"
                  </li>
                ) : (
                  filteredTags.map((tag) => (
                    <li key={tag}>
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
  )
}
