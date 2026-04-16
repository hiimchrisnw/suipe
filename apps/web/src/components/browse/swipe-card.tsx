import type { Swipe } from "@suipe/schemas"
import { useEffect, useRef } from "react"
import { useIsVisible } from "../../hooks/use-is-visible"
import { getMediaUrl } from "../../lib/image-url"

interface SwipeCardProps {
  swipe: Swipe
  onSelect: (swipe: Swipe) => void
}

// Module-level constant — referentially stable, never re-triggers subscription
const OBSERVER_OPTIONS: IntersectionObserverInit = { rootMargin: "200px", threshold: 0 }

// Constant-pixel hover lift expressed as scale. 8px total (4 per side).
const HOVER_DELTA_PX = 8

export function SwipeCard({ swipe, onSelect }: SwipeCardProps) {
  const url = getMediaUrl(swipe)
  const cardRef = useRef<HTMLButtonElement>(null)
  const isVisible = useIsVisible(cardRef, OBSERVER_OPTIONS)

  // legitimate-useeffect: subscribing to ResizeObserver so hover scale tracks measured card height
  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    const update = () => {
      const h = el.offsetHeight
      if (h > 0) el.style.setProperty("--hover-scale", String(1 + HOVER_DELTA_PX / h))
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <button
      ref={cardRef}
      type="button"
      onClick={() => onSelect(swipe)}
      className="relative w-full cursor-pointer text-left md:transition-transform md:duration-300 md:ease-[cubic-bezier(0.34,1.56,0.64,1)] md:hover:scale-[var(--hover-scale,1.02)]"
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
