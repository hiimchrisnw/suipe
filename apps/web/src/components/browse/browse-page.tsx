import type { Swipe } from "@suipe/schemas"
import { useCallback, useState } from "react"
import { useSwipes } from "../../hooks/use-swipes"
import { useTags } from "../../hooks/use-tags"
import { useSearchParam } from "../../lib/router"
import { MasonryGrid } from "./masonry-grid"
import { SwipeModal } from "./swipe-modal"
import { TagFilter } from "./tag-filter"

export function BrowsePage() {
  const activeTag = useSearchParam("tag")
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useSwipes(activeTag)
  const [selected, setSelected] = useState<Swipe | null>(null)

  const swipes = data?.pages.flat() ?? []

  // Use dedicated tags endpoint — paginated swipes only cover the loaded pages
  const { data: tags } = useTags()
  const allTags = tags ?? []

  // React 19 callback ref — returns cleanup function, no useEffect needed
  const sentinelRef = useCallback(
    (el: HTMLDivElement | null) => {
      if (!el) return
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
            fetchNextPage()
          }
        },
        { rootMargin: "400px", threshold: 0 },
      )
      observer.observe(el)
      return () => observer.disconnect()
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage],
  )

  return (
    <div className="space-y-4 p-6">
      <TagFilter tags={allTags} activeTag={activeTag} />
      {isLoading ? (
        <p className="py-20 text-center text-gray-400">Loading...</p>
      ) : (
        <MasonryGrid swipes={swipes} onSelect={setSelected} />
      )}
      <div ref={sentinelRef} aria-hidden="true" />
      {isFetchingNextPage && <p className="py-4 text-center text-gray-400">Loading more...</p>}
      {selected && <SwipeModal swipe={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
