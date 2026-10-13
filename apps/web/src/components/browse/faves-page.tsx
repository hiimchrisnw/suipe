import type { Swipe } from "@suipe/schemas"
import { useQueryClient } from "@tanstack/react-query"
import { useSyncExternalStore } from "react"
import { useSwipesByIds } from "../../hooks/use-swipes-by-ids"
import { getLikedIds, subscribeLikes } from "../../lib/likes"
import { setSearchParam } from "../../lib/router"
import { GRID_CLASS } from "./browse-page"
import { SwipeCard } from "./swipe-card"

const EMPTY: string[] = []

export function FavesPage() {
  const likedIds = useSyncExternalStore(subscribeLikes, getLikedIds, () => EMPTY)
  const { data, isLoading } = useSwipesByIds(likedIds)
  const queryClient = useQueryClient()

  function openSwipe(swipe: Swipe) {
    queryClient.setQueryData(["swipes-by-ids", swipe.id], [swipe])
    setSearchParam("swipe", swipe.id)
  }

  // Deliberately rendered from the fetched list rather than the live id set: un-hearting something
  // here empties the heart without the tile vanishing under the cursor, so a mis-click is undoable
  // until the next visit.
  const swipes = data ?? []

  return (
    <div className="px-3 pt-6 pb-3 md:px-7 md:pt-8 md:pb-7">
      {likedIds.length === 0 ? (
        <p className="py-20 text-center text-paper/40">
          Nothing saved yet. Tap the heart on a swipe to keep it here.
        </p>
      ) : isLoading ? (
        <div className={GRID_CLASS}>
          {likedIds.slice(0, 12).map((id) => (
            <div key={id} className="skeleton aspect-square w-full rounded-[16px]" />
          ))}
        </div>
      ) : (
        <div className={GRID_CLASS}>
          {swipes.map((swipe) => (
            <SwipeCard key={swipe.id} swipe={swipe} onSelect={openSwipe} />
          ))}
        </div>
      )}
    </div>
  )
}
