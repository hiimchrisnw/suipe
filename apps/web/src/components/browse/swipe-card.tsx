import type { Swipe } from "@suipe/schemas"
import { getMediaUrl } from "../../lib/image-url"

interface SwipeCardProps {
  swipe: Swipe
  onSelect: (swipe: Swipe) => void
}

function getDomain(url: string): string | null {
  try {
    return new URL(url).hostname.replace("www.", "")
  } catch {
    return null
  }
}

export function SwipeCard({ swipe, onSelect }: SwipeCardProps) {
  const url = getMediaUrl(swipe)
  const domain = swipe.sourceUrl ? getDomain(swipe.sourceUrl) : null

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
      {domain && (
        <span className="absolute bottom-2 left-2 rounded bg-black/50 px-1.5 py-0.5 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
          {domain}
        </span>
      )}
    </button>
  )
}
