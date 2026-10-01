import type { Swipe } from "@suipe/schemas"
import { Heart } from "lucide-react"
import { useCallback, useRef, useSyncExternalStore } from "react"
import { useIsVisible } from "../../hooks/use-is-visible"
import { getMediaUrl } from "../../lib/image-url"
import { isLiked as readLiked, subscribeLikes, toggleLike } from "../../lib/likes"

interface SwipeCardProps {
  swipe: Swipe
  onSelect: (swipe: Swipe) => void
}

// Module-level constant — referentially stable, never re-triggers subscription
const OBSERVER_OPTIONS: IntersectionObserverInit = { rootMargin: "200px", threshold: 0 }

export function SwipeCard({ swipe, onSelect }: SwipeCardProps) {
  const url = getMediaUrl(swipe)
  const cardRef = useRef<HTMLDivElement>(null)
  const isVisible = useIsVisible(cardRef, OBSERVER_OPTIONS)
  const getLiked = useCallback(() => readLiked(swipe.id), [swipe.id])
  const isLiked = useSyncExternalStore(subscribeLikes, getLiked, () => false)
  const objectPosition = `${swipe.focalX ?? 50}% ${swipe.focalY ?? 50}%`

  return (
    // A plain wrapper: the tile and the heart are separate buttons, which a button cannot nest.
    <div ref={cardRef} data-liked={isLiked} className="group relative isolate aspect-square w-full">
      <button
        type="button"
        onClick={() => onSelect(swipe)}
        // overflow-hidden clips the focus ring's huge shadow — and every corner — to the tile.
        className="absolute inset-0 z-10 cursor-pointer overflow-hidden rounded-[16px] text-left transition-[border-radius] duration-[553ms] ease-spring group-hover:rounded-tr-[112px] group-data-[liked=true]:rounded-tr-[112px]"
      >
        {swipe.mediaType === "video" ? (
          <video
            src={isVisible ? url : ""}
            muted
            autoPlay
            loop
            playsInline
            style={{ objectPosition }}
            className="h-full w-full object-cover"
          />
        ) : (
          <img
            src={url}
            alt={swipe.description ?? ""}
            loading="lazy"
            style={{ objectPosition }}
            className="h-full w-full object-cover"
          />
        )}

        {/* The inner hairline follows the same peel. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[16px] border border-paper/10 transition-[border-radius] duration-[553ms] ease-spring group-hover:rounded-tr-[112px] group-data-[liked=true]:rounded-tr-[112px]"
        />
      </button>

      <button
        type="button"
        onClick={() => toggleLike(swipe.id)}
        aria-pressed={isLiked}
        aria-label={isLiked ? "Remove from faves" : "Fave"}
        // Rides in with the corner, and stays put once liked.
        className="pointer-events-none absolute top-[3px] right-[3px] z-0 translate-x-[-16px] translate-y-[16px] scale-75 cursor-pointer opacity-0 transition-[translate,scale,opacity] duration-[553ms] ease-spring group-hover:pointer-events-auto group-hover:translate-x-0 group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100 group-data-[liked=true]:pointer-events-auto group-data-[liked=true]:translate-x-0 group-data-[liked=true]:translate-y-0 group-data-[liked=true]:scale-100 group-data-[liked=true]:opacity-100"
      >
        <Heart
          className={`size-6 ${
            isLiked
              ? "animate-[heart-pulse_320ms_ease-out] fill-current text-[#ff5247]"
              : "text-paper"
          }`}
          strokeWidth={1.5}
        />
      </button>
    </div>
  )
}
