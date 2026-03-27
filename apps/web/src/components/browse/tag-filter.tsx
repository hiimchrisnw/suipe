import { navigate } from "../../lib/router"

interface TagFilterProps {
  tags: string[]
  activeTag?: string | undefined
}

export function TagFilter({ tags, activeTag }: TagFilterProps) {
  if (tags.length === 0) return null

  function setTag(tag: string | undefined) {
    const url = new URL(window.location.href)
    if (tag) {
      url.searchParams.set("tag", tag)
    } else {
      url.searchParams.delete("tag")
    }
    navigate(url.pathname + url.search)
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      <button
        type="button"
        onClick={() => setTag(undefined)}
        className={`shrink-0 rounded-full px-3 py-1 text-sm ${
          !activeTag ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        }`}
      >
        All
      </button>
      {tags.map((tag) => (
        <button
          key={tag}
          type="button"
          onClick={() => setTag(tag)}
          className={`shrink-0 rounded-full px-3 py-1 text-sm ${
            activeTag === tag
              ? "bg-gray-900 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {tag}
        </button>
      ))}
    </div>
  )
}
