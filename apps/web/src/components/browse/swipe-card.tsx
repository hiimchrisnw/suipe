import type { Swipe } from "@suipe/schemas"
import { Heart } from "lucide-react"
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react"
import { useIsVisible } from "../../hooks/use-is-visible"
import { readIconBackground } from "../../lib/icon-color"
import { getAssetUrl, getFaviconUrl, getMediaUrl, getSourceDomain } from "../../lib/image-url"
import { isLiked as readLiked, subscribeLikes, toggleLike } from "../../lib/likes"

interface SwipeCardProps {
  swipe: Swipe
  onSelect: (swipe: Swipe) => void
}

// Icons that fill their whole square read larger than the rest at the same size, so they sit
// smaller in the circle. Keyed by source domain.
const SMALLER_ICONS = new Set(["recent.design"])

// X's own favicon is a white glyph on a black rounded square, which reads as a black box dropped
// inside the circle. Draw the mark itself instead so it sits like every other source.
const X_DOMAINS = new Set(["x.com", "twitter.com", "mobile.twitter.com"])

function XMark() {
  return (
    <svg viewBox="0 0 1200 1227" aria-hidden="true" className="size-[13px] fill-black">
      <path d="M714.163 519.284 1160.89 0h-105.86L667.137 450.887 357.328 0H0l468.492 681.821L0 1226.37h105.866l409.625-476.152 327.181 476.152H1200L714.137 519.284h.026ZM569.165 687.828l-47.468-67.894-377.686-540.24h162.604l304.797 435.991 47.468 67.894 396.2 566.721H892.476L569.165 687.854v-.026Z" />
    </svg>
  )
}

// Module-level constants — referentially stable, never re-trigger subscription.
//
// Two bands, because loading and playing want different answers. A card keeps its src across a
// wide band so scrolling back up does not re-download a clip it already has — src was previously
// cleared the moment a card left the narrow band, which showed up as the same mp4 being requested
// over and over with aborted range requests. Playback follows the narrow band instead, so only
// what is nearly on screen is actually decoding.
const PLAY_OPTIONS: IntersectionObserverInit = { rootMargin: "200px", threshold: 0 }
const RETAIN_OPTIONS: IntersectionObserverInit = { rootMargin: "1200px", threshold: 0 }

export function SwipeCard({ swipe, onSelect }: SwipeCardProps) {
  const url = getMediaUrl(swipe)
  const cardRef = useRef<HTMLDivElement>(null)
  const isPlaying = useIsVisible(cardRef, PLAY_OPTIONS)
  const isRetained = useIsVisible(cardRef, RETAIN_OPTIONS)
  const videoRef = useRef<HTMLVideoElement>(null)
  const getLiked = useCallback(() => readLiked(swipe.id), [swipe.id])
  const isLiked = useSyncExternalStore(subscribeLikes, getLiked, () => false)
  const objectPosition = `${swipe.focalX ?? 50}% ${swipe.focalY ?? 50}%`
  const sourceDomain = getSourceDomain(swipe.sourceUrl)
  // A site with no favicon drops the avatar rather than showing a broken image.
  const [faviconFailed, setFaviconFailed] = useState(false)
  const [faviconBg, setFaviconBg] = useState<string | null>(null)
  // The skeleton covers the tile until there are actual pixels to show.
  const [isMediaReady, setIsMediaReady] = useState(false)

  // Decode only what is nearly on screen; the clip stays loaded either way. A clip that has just
  // arrived starts from onLoadedData instead — play() before there is any data rejects, and this
  // effect would not run again to retry it.
  useEffect(() => {
    const video = videoRef.current
    if (!video || !isRetained) return
    if (isPlaying) void video.play().catch(() => {})
    else video.pause()
  }, [isPlaying, isRetained])

  return (
    // A plain wrapper: the tile and the heart are separate buttons, which a button cannot nest.
    <div
      ref={cardRef}
      data-liked={isLiked}
      className="group relative isolate aspect-square w-full overflow-hidden rounded-[16px]"
    >
      {/* Sits behind the tile at the card's own radius, so whatever the corner peels away from
          shows red. Static: the tile's radius is the only thing that moves. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 rounded-[16px] bg-ink md:bg-[#ff5247]"
      />

      <button
        type="button"
        onClick={() => onSelect(swipe)}
        // overflow-hidden clips the focus ring's huge shadow — and every corner — to the tile.
        className="absolute inset-0 z-10 cursor-pointer overflow-hidden rounded-[16px] rounded-tr-[112px] bg-ink text-left transition-[border-radius] duration-[553ms] ease-spring md:rounded-tr-[16px] md:shadow-[0_0_14px_rgba(0,0,0,0.3)] md:group-hover:rounded-tr-[112px] md:group-data-[liked=true]:rounded-tr-[112px]"
      >
        {swipe.mediaType === "video" ? (
          <video
            ref={videoRef}
            src={isRetained ? url : ""}
            muted
            autoPlay
            loop
            playsInline
            onLoadedData={() => {
              setIsMediaReady(true)
              if (isPlaying) void videoRef.current?.play().catch(() => {})
            }}
            style={{ objectPosition }}
            className="h-full w-full object-cover"
          />
        ) : (
          <img
            src={url}
            alt={swipe.description ?? ""}
            loading="lazy"
            onLoad={() => setIsMediaReady(true)}
            style={{ objectPosition }}
            className="h-full w-full object-cover"
          />
        )}

        {/* Holds the card's shape while the media arrives, instead of a blank tile. */}
        {!isMediaReady && (
          <span aria-hidden="true" className="skeleton pointer-events-none absolute inset-0" />
        )}

        {/* Who it came from, sat in the opposite corner to the peel. When the poster is known the
            credit goes to them; the platform's mark is the fallback for everything we only know
            the site for. */}
        {swipe.authorAvatar ? (
          <span
            title={swipe.authorHandle ?? undefined}
            className="pointer-events-none absolute bottom-2 left-2 size-6 overflow-hidden rounded-full ring-1 ring-black/10"
          >
            <img
              src={getAssetUrl(swipe.authorAvatar)}
              alt=""
              loading="lazy"
              className="size-full object-cover"
            />
          </span>
        ) : (
          sourceDomain &&
          !faviconFailed && (
            <span
              title={sourceDomain}
              // The icon sits inset with its own background colour carried out to the rim. The default fill
              // is white in both themes, since favicons are drawn for light browser tabs.
              style={faviconBg ? { backgroundColor: faviconBg } : undefined}
              className="pointer-events-none absolute bottom-2 left-2 flex size-6 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-black/10"
            >
              {X_DOMAINS.has(sourceDomain) ? (
                <XMark />
              ) : (
                <img
                  src={getFaviconUrl(sourceDomain)}
                  alt=""
                  loading="lazy"
                  crossOrigin="anonymous"
                  onLoad={(e) => setFaviconBg(readIconBackground(e.currentTarget))}
                  onError={() => setFaviconFailed(true)}
                  className={`object-contain ${
                    SMALLER_ICONS.has(sourceDomain) ? "size-[13px]" : "size-[18px]"
                  }`}
                />
              )}
            </span>
          )
        )}

        {/* The inner hairline follows the same peel. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[16px] rounded-tr-[112px] border border-paper/10 transition-[border-radius] duration-[553ms] ease-spring md:rounded-tr-[16px] md:group-hover:rounded-tr-[112px] md:group-data-[liked=true]:rounded-tr-[112px]"
        />
      </button>

      {/* z-20 and a 44px box on phones: the heart used to sit behind the tile, reachable only
          through the sliver of corner the peel cuts away, which measured about 12px of usable
          diagonal — a tap a few pixels out opened the modal instead. It now owns the top right
          corner outright. From md up it goes back behind the tile at icon size, where the hover
          peel reveals it and there is a cursor to aim with. */}
      <button
        type="button"
        onClick={() => toggleLike(swipe.id)}
        aria-pressed={isLiked}
        aria-label={isLiked ? "Remove from faves" : "Fave"}
        // Rides in with the corner, and stays put once liked.
        className="pointer-events-auto absolute top-[3px] right-[3px] z-20 flex size-11 translate-x-0 translate-y-0 scale-100 cursor-pointer items-start justify-end opacity-100 transition-[translate,scale,opacity] duration-[553ms] ease-spring md:pointer-events-none md:top-[9px] md:right-[9px] md:z-0 md:size-[22px] md:translate-x-[-16px] md:translate-y-[16px] md:scale-75 md:opacity-0 md:group-hover:pointer-events-auto md:group-hover:translate-x-0 md:group-hover:translate-y-0 md:group-hover:scale-100 md:group-hover:opacity-100 md:group-data-[liked=true]:pointer-events-auto md:group-data-[liked=true]:translate-x-0 md:group-data-[liked=true]:translate-y-0 md:group-data-[liked=true]:scale-100 md:group-data-[liked=true]:opacity-100"
      >
        {/* White on the red beneath: an outline until liked, then filled. */}
        <Heart
          className={`size-[22px] ${
            isLiked
              ? "animate-[heart-pulse_320ms_ease-out] fill-current text-[#ff5247] md:text-white"
              : "fill-none text-white"
          }`}
          // The outline carries the shape on its own until it fills, so it takes a touch more weight.
          strokeWidth={isLiked ? 1 : 1.25}
        />
      </button>
    </div>
  )
}
