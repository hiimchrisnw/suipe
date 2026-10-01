import { MAX_TRAITS } from "@suipe/schemas"
import { PRESET_TAGS } from "../../hooks/use-tags"

interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  isPending: boolean
}

export function TagInput({ tags, onChange, isPending }: TagInputProps) {
  const selected = new Set(tags)
  const isAtLimit = tags.length >= MAX_TRAITS

  function toggle(tag: string) {
    if (selected.has(tag)) {
      onChange(tags.filter((t) => t !== tag))
    } else {
      onChange([...tags, tag])
    }
  }

  return (
    <div>
      <span className="mb-1 flex items-center gap-2 text-base font-normal text-gray-700">
        Tags
        <span className="text-base font-normal text-gray-400">{MAX_TRAITS} max</span>
        {isPending && (
          <span className="text-base font-normal text-gray-400">Suggesting tags...</span>
        )}
      </span>
      <div className="flex flex-wrap gap-2">
        {PRESET_TAGS.map((tag) => {
          const isSelected = selected.has(tag)
          // At the cap the rest lock, but a selected tag can always be given back.
          const isBlocked = !isSelected && isAtLimit
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggle(tag)}
              disabled={isBlocked}
              aria-pressed={isSelected}
              className={
                isSelected
                  ? "rounded-full bg-gray-900 px-4 py-1.5 text-base font-normal text-white"
                  : `rounded-full bg-gray-100 px-4 py-1.5 text-base font-normal text-gray-600 ${
                      isBlocked ? "opacity-40" : "hover:bg-gray-200"
                    }`
              }
            >
              {tag}
            </button>
          )
        })}
      </div>
    </div>
  )
}
