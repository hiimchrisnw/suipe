import type { Swipe } from "@suipe/schemas"
import { useCallback, useState } from "react"
import { useSelectedTraits } from "../../hooks/use-selected-traits"
import { useSwipes } from "../../hooks/use-swipes"
import { SwipeCard } from "./swipe-card"
import { SwipeModal } from "./swipe-modal"

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
    <div className="px-4 pt-6 pb-4 md:px-7 md:pt-8 md:pb-7">
      {isLoading ? (
        <p className="py-20 text-center text-paper/40">Loading...</p>
      ) : swipes.length === 0 && emotions.length > 0 ? (
        <p className="py-20 text-center text-paper/40">
          No swipes match this combination. Try removing a trait.
        </p>
      ) : (
        <div
          // Keyed on the filter so each new result set mounts and fades in rather than snapping;
          // while the next set loads the previous one is held and dimmed.
          key={emotions.join(",")}
          className={`grid animate-[fade-in_300ms_ease-out] grid-cols-1 gap-3 transition-opacity duration-300 ease-out sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 ${
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
