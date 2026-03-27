import type { Swipe } from "@suipe/schemas"
import { getImageUrl } from "../../lib/image-url"

interface SwipeCardProps {
  swipe: Swipe
  onSelect: (swipe: Swipe) => void
}

export function SwipeCard({ swipe, onSelect }: SwipeCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(swipe)}
      className="w-full cursor-pointer text-left"
    >
      {swipe.mediaType === "video" ? (
        <video
          src={getImageUrl(swipe.imageUrl)}
          muted
          autoPlay
          loop
          playsInline
          className="w-full rounded-lg"
        />
      ) : (
        <img
          src={getImageUrl(swipe.imageUrl)}
          alt={swipe.description ?? ""}
          loading="lazy"
          className="w-full rounded-lg"
        />
      )}
    </button>
  )
}
