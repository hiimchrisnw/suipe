import type { Swipe } from "@suipe/schemas"
import { useState, useSyncExternalStore } from "react"
import { useLikedSwipes } from "../../hooks/use-liked-swipes"
import { getLikedIds, subscribeLikes } from "../../lib/likes"
import { GRID_CLASS } from "./browse-page"
import { SwipeCard } from "./swipe-card"
import { SwipeModal } from "./swipe-modal"

const EMPTY: string[] = []

export function FavesPage() {
  const likedIds = useSyncExternalStore(subscribeLikes, getLikedIds, () => EMPTY)
  const { data, isLoading } = useLikedSwipes(likedIds)
  const [selected, setSelected] = useState<Swipe | null>(null)

  // Deliberately rendered from the fetched list rather than the live id set: un-hearting something
  // here empties the heart without the tile vanishing under the cursor, so a mis-click is undoable
  // until the next visit.
  const swipes = data ?? []

  return (
    <div className="px-4 pt-6 pb-4 md:px-7 md:pt-8 md:pb-7">
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
            <SwipeCard key={swipe.id} swipe={swipe} onSelect={setSelected} />
          ))}
        </div>
      )}
      {selected && <SwipeModal swipe={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
