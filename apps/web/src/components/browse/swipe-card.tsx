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
      {swipe.tags.length > 0 && (
        <div className="pointer-events-none absolute inset-0 hidden rounded-lg bg-black/40 opacity-0 transition-opacity duration-200 md:block md:group-hover:opacity-100">
          <div className="absolute right-3 bottom-3 left-3 flex flex-wrap gap-1.5">
            {swipe.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-white/90 px-3 py-1 text-sm font-normal text-gray-900"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </button>
  )
}
