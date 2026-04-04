import type { Swipe } from "@suipe/schemas"
import { useRef } from "react"
import { useIsVisible } from "../../hooks/use-is-visible"
import { getMediaUrl } from "../../lib/image-url"

interface SwipeCardProps {
  swipe: Swipe
  onSelect: (swipe: Swipe) => void
}

// Module-level constant — referentially stable, never re-triggers subscription
const OBSERVER_OPTIONS: IntersectionObserverInit = { rootMargin: "200px", threshold: 0 }

export function SwipeCard({ swipe, onSelect }: SwipeCardProps) {
  const url = getMediaUrl(swipe)
  const cardRef = useRef<HTMLButtonElement>(null)
  const isVisible = useIsVisible(cardRef, OBSERVER_OPTIONS)

  return (
    <button
      ref={cardRef}
      type="button"
      onClick={() => onSelect(swipe)}
      className="group relative w-full cursor-pointer text-left"
    >
      {swipe.mediaType === "video" ? (
        <video
          src={isVisible ? url : ""}
          muted
          autoPlay
          loop
          playsInline
          className="w-full rounded-lg"
        />
      ) : (
        <img src={url} alt={swipe.description ?? ""} loading="lazy" className="w-full rounded-lg" />
      )}
    </button>
  )
}
