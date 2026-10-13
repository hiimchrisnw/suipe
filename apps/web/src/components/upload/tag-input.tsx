import { PRESET_TAGS, TRAIT_NOTES } from "../../hooks/use-tags"

interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
}

export function TagInput({ tags, onChange }: TagInputProps) {
  const selected = new Set(tags)

  function toggle(tag: string) {
    if (selected.has(tag)) {
      onChange(tags.filter((t) => t !== tag))
    } else {
      onChange([...tags, tag])
    }
  }

  return (
    <div>
      <span className="mb-1 flex items-center gap-2 text-base font-normal text-gray-700">Tags</span>
      {/* Two columns of cards rather than a row of pills: each trait carries the note that says
          what it means, so tagging stays consistent months apart. */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {PRESET_TAGS.map((tag) => {
          const isSelected = selected.has(tag)
          const note = TRAIT_NOTES[tag]
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggle(tag)}
              aria-pressed={isSelected}
              className={`flex flex-col items-start gap-0.5 rounded-xl px-4 py-2.5 text-left ${
                isSelected
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <span className="text-base font-normal">{tag}</span>
              <span
                className={`text-[11px] leading-snug ${isSelected ? "text-white/60" : "text-gray-500"}`}
              >
                {note}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
