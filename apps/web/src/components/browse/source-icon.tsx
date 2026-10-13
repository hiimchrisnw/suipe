import { useState } from "react"
import { readIconBackground } from "../../lib/icon-color"
import { getAssetUrl, getFaviconUrl } from "../../lib/image-url"

// Icons that fill their whole square read larger than the rest at the same size, so they sit
// smaller in the circle. Keyed by source domain.
const SMALLER_ICONS = new Set(["recent.design"])

// X's own favicon is a white glyph on a black rounded square, which reads as a black box dropped
// inside the circle. Draw the mark itself instead so it sits like every other source.
const X_DOMAINS = new Set(["x.com", "twitter.com", "mobile.twitter.com"])

function XMark({ px }: { px: number }) {
  return (
    <svg
      viewBox="0 0 1200 1227"
      aria-hidden="true"
      className="fill-black"
      style={{ width: px, height: px }}
    >
      <path d="M714.163 519.284 1160.89 0h-105.86L667.137 450.887 357.328 0H0l468.492 681.821L0 1226.37h105.866l409.625-476.152 327.181 476.152H1200L714.137 519.284h.026ZM569.165 687.828l-47.468-67.894-377.686-540.24h162.604l304.797 435.991 47.468 67.894 396.2 566.721H892.476L569.165 687.854v-.026Z" />
    </svg>
  )
}

interface SourceIconProps {
  /** R2 key of the poster's avatar, when we know who posted it. */
  authorAvatar: string | null
  /** Bare domain of the source site, used when there is no person. */
  sourceDomain: string | null
  title?: string | undefined
  /** Diameter of the circle in px. The glyph inside scales with it. */
  size: number
  className?: string
}

/**
 * The circular source mark, shared by the grid card and the modal's credit so the two can never
 * drift. A favicon sits inset with its own background colour carried out to the rim — most are
 * drawn for a light browser tab, so the circle defaults to white and is repainted once the icon's
 * corner can be sampled. Renders nothing when there is neither a person nor a resolvable icon.
 */
export function SourceIcon({
  authorAvatar,
  sourceDomain,
  title,
  size,
  className = "",
}: SourceIconProps) {
  const [faviconFailed, setFaviconFailed] = useState(false)
  const [faviconBg, setFaviconBg] = useState<string | null>(null)

  const box = { width: size, height: size }

  if (authorAvatar) {
    return (
      <span
        title={title}
        style={box}
        className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-black/10 ${className}`}
      >
        <img
          src={getAssetUrl(authorAvatar)}
          alt=""
          loading="lazy"
          className="size-full object-cover"
        />
      </span>
    )
  }

  if (!sourceDomain || faviconFailed) return null

  // The glyph keeps the same proportion of the circle it had at 24px.
  const glyph = Math.round((SMALLER_ICONS.has(sourceDomain) ? 13 : 18) * (size / 24))

  return (
    <span
      title={title ?? sourceDomain}
      style={{ ...box, ...(faviconBg ? { backgroundColor: faviconBg } : {}) }}
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-black/10 ${className}`}
    >
      {X_DOMAINS.has(sourceDomain) ? (
        <XMark px={glyph} />
      ) : (
        <img
          src={getFaviconUrl(sourceDomain)}
          alt=""
          loading="lazy"
          crossOrigin="anonymous"
          onLoad={(e) => setFaviconBg(readIconBackground(e.currentTarget))}
          onError={() => setFaviconFailed(true)}
          style={{ width: glyph, height: glyph }}
          className="object-contain"
        />
      )}
    </span>
  )
}
