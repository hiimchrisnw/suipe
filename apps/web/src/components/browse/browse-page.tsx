import type { Swipe } from "@suipe/schemas"
import { useCallback, useState } from "react"
import { useSelectedTraits } from "../../hooks/use-selected-traits"
import { useSwipes } from "../../hooks/use-swipes"
import { SwipeCard } from "./swipe-card"
import { SwipeModal } from "./swipe-modal"

// Enough to fill a large screen; the real grid replaces them as soon as the first page lands.
const SKELETON_COUNT = 12

export const GRID_CLASS = "grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"

export function BrowsePage() {
  const emotions = useSelectedTraits()
  const { data, isLoading, isPlaceholderData, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSwipes(emotions.length > 0 ? emotions : undefined)
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
    <div className="px-3 pt-6 pb-3 md:px-7 md:pt-8 md:pb-7">
      {isLoading ? (
        <div className={GRID_CLASS}>
          {Array.from({ length: SKELETON_COUNT }, (_, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length placeholder list
              key={i}
              className="skeleton aspect-square w-full rounded-[16px]"
            />
          ))}
        </div>
      ) : swipes.length === 0 && emotions.length > 0 ? (
        <p className="py-20 text-center text-paper/40">
          No swipes match this combination. Try removing a trait.
        </p>
      ) : (
        <div
          className={`${GRID_CLASS} transition-opacity duration-300 ease-out ${
            isPlaceholderData ? "opacity-40" : "opacity-100"
          }`}
        >
          {swipes.map((swipe) => (
            <SwipeCard key={swipe.id} swipe={swipe} onSelect={setSelected} />
          ))}
        </div>
      )}
      <div ref={sentinelRef} aria-hidden="true" />
      {isFetchingNextPage && <p className="py-4 text-center text-paper/40">Loading more...</p>}
      {selected && <SwipeModal swipe={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
