import type { Swipe } from "@suipe/schemas"
import { SwipeCard } from "./swipe-card"

interface MasonryGridProps {
  swipes: Swipe[]
  onSelect: (swipe: Swipe) => void
}

export function MasonryGrid({ swipes, onSelect }: MasonryGridProps) {
  if (swipes.length === 0) {
    return <p className="py-20 text-center text-gray-400">No swipes yet</p>
  }

  return (
    <div className="masonry">
      {swipes.map((swipe) => (
        <SwipeCard key={swipe.id} swipe={swipe} onSelect={onSelect} />
      ))}
    </div>
  )
}
