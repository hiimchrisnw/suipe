import type { Swipe } from "@suipe/schemas"
import { useMemo, useState } from "react"
import { useSwipes } from "../../hooks/use-swipes"
import { useSearchParam } from "../../lib/router"
import { MasonryGrid } from "./masonry-grid"
import { SwipeModal } from "./swipe-modal"
import { TagFilter } from "./tag-filter"

export function BrowsePage() {
  const activeTag = useSearchParam("tag")
  const { data: swipes, isLoading } = useSwipes(activeTag)
  const [selected, setSelected] = useState<Swipe | null>(null)

  const allTags = useMemo(() => {
    if (!swipes) return []
    const set = new Set(swipes.flatMap((s) => s.tags))
    return [...set].sort()
  }, [swipes])

  return (
    <div className="space-y-4 p-6">
      <TagFilter tags={allTags} activeTag={activeTag} />
      {isLoading ? (
        <p className="py-20 text-center text-gray-400">Loading...</p>
      ) : (
        <MasonryGrid swipes={swipes ?? []} onSelect={setSelected} />
      )}
      {selected && <SwipeModal swipe={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
