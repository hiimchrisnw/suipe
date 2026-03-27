import type { Swipe } from "@suipe/schemas"
import { getMediaUrl } from "../../lib/image-url"

interface SwipeCardProps {
  swipe: Swipe
  onSelect: (swipe: Swipe) => void
}

export function SwipeCard({ swipe, onSelect }: SwipeCardProps) {
  const url = getMediaUrl(swipe)

  return (
    <button
      type="button"
      onClick={() => onSelect(swipe)}
      className="group relative w-full cursor-pointer text-left"
    >
      {swipe.mediaType === "video" ? (
        <video src={url} muted autoPlay loop playsInline className="w-full rounded-lg" />
      ) : (
        <img src={url} alt={swipe.description ?? ""} loading="lazy" className="w-full rounded-lg" />
      )}
    </button>
  )
}
