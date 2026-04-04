import type { Swipe } from "@suipe/schemas"
import { useCallback, useState } from "react"
import { useSwipes } from "../../hooks/use-swipes"
import { useSearchParamArray } from "../../lib/router"
import { MasonryGrid } from "./masonry-grid"
import { RecipeBuilder } from "./recipe-builder"
import { SwipeModal } from "./swipe-modal"

export function BrowsePage() {
  const emotions = useSearchParamArray("emotions")
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useSwipes(
    emotions.length > 0 ? emotions : undefined,
  )
  const [selected, setSelected] = useState<Swipe | null>(null)

  const swipes = data?.pages.flat() ?? []

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
      <RecipeBuilder emotions={emotions} />
      {isLoading ? (
        <p className="py-20 text-center text-gray-400">Loading...</p>
      ) : swipes.length === 0 && emotions.length > 0 ? (
        <p className="py-20 text-center text-gray-400">
          No swipes match this combination. Try removing an emotion.
        </p>
      ) : (
        <MasonryGrid swipes={swipes} onSelect={setSelected} resetKey={emotions.join(",")} />
      )}
      <div ref={sentinelRef} aria-hidden="true" />
      {isFetchingNextPage && <p className="py-4 text-center text-gray-400">Loading more...</p>}
      {selected && <SwipeModal swipe={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
