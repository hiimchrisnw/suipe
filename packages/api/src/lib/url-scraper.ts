interface FetchUrlResult {
  url: string
  mimeType: string
  // Set only by handlers that can name the original post. Lets the caller store where a thing
  // actually came from rather than whichever link happened to be pasted.
  sourceUrl?: string
  authorName?: string
  authorHandle?: string
  // Where the avatar lives on the source site. The caller rehosts it; nothing stores this as-is.
  authorAvatarUrl?: string
  // True when the media host refuses browser requests, so the caller must serve it from our own
  // origin rather than pointing a page at it.
  rehostRequired?: boolean
}

const DIRECT_MEDIA_EXTENSIONS: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  svg: "image/svg+xml",
  mp4: "video/mp4",
  webm: "video/webm",
}

function getExtensionFromUrl(url: string): string | undefined {
  try {
    const pathname = new URL(url).pathname
    const ext = pathname.split(".").pop()?.toLowerCase()
    return ext && ext in DIRECT_MEDIA_EXTENSIONS ? ext : undefined
  } catch {
    return undefined
  }
}

function getMimeFromContentType(contentType: string): string | undefined {
  const mime = contentType.split(";")[0]?.trim().toLowerCase()
  if (mime?.startsWith("image/") || mime?.startsWith("video/")) return mime
  return undefined
}

async function verifyMediaUrl(url: string): Promise<FetchUrlResult> {
  try {
    const res = await fetch(url, { method: "HEAD" })
    if (res.ok) {
      const mime = getMimeFromContentType(res.headers.get("content-type") ?? "")
      if (mime) return { url, mimeType: mime }
    }
  } catch {
    // fall through to Range GET
  }

  try {
    const res = await fetch(url, { method: "GET", headers: { Range: "bytes=0-0" } })
    const mime = res.ok ? getMimeFromContentType(res.headers.get("content-type") ?? "") : undefined
    await res.body?.cancel()
    if (mime) return { url, mimeType: mime }
  } catch {
    // fall through to unverified return
  }

  const ext = getExtensionFromUrl(url)
  const fallback = ext !== undefined ? DIRECT_MEDIA_EXTENSIONS[ext] : undefined
  return { url, mimeType: fallback ?? "application/octet-stream" }
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
}

function extractMetaContent(html: string, property: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, "i"),
    new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${property}["']`, "i"),
  ]
  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) return decodeHtmlEntities(match[1])
  }
  return null
}

function extractImgSrcs(html: string): string[] {
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi
  const srcs: string[] = []
  for (const match of html.matchAll(imgRegex)) {
    if (match[1]) srcs.push(decodeHtmlEntities(match[1]))
  }
  return srcs
}

function extractVideoSrcs(html: string): string[] {
  const srcs: string[] = []
  const videoRegex = /<video[^>]+src=["']([^"']+)["']/gi
  for (const match of html.matchAll(videoRegex)) {
    if (match[1]) srcs.push(decodeHtmlEntities(match[1]))
  }
  const sourceRegex = /<source[^>]+src=["']([^"']+)["']/gi
  for (const match of html.matchAll(sourceRegex)) {
    if (match[1]) srcs.push(decodeHtmlEntities(match[1]))
  }
  return srcs
}

function extractMediaLinks(html: string): string[] {
  const aRegex =
    /<a[^>]+href=["']([^"']+\.(?:mp4|webm|mov|m4v|gif|png|jpe?g|webp|avif)(?:\?[^"']*)?)["']/gi
  const hrefs: string[] = []
  for (const match of html.matchAll(aRegex)) {
    if (match[1]) hrefs.push(decodeHtmlEntities(match[1]))
  }
  return hrefs
}

// Some SPAs (Savee) intermittently serve a pre-hydration shell whose only og:image is the
// site-wide default. That yields a "successful" scrape pointing at a placeholder, so treat
// these as a miss and let the caller retry for a properly rendered response.
const PLACEHOLDER_MEDIA_PATTERNS = [
  /\/default-og-image\./i,
  /\/img\/default-/i,
  /\/placeholder[-.]/i,
]

function isPlaceholderMedia(url: string): boolean {
  return PLACEHOLDER_MEDIA_PATTERNS.some((pattern) => pattern.test(url))
}

function resolveUrl(base: string, relative: string): string {
  try {
    return new URL(relative, base).href
  } catch {
    return relative
  }
}

function findPrimaryMediaUrl(url: string, html: string): string | null {
  const ogVideo = extractMetaContent(html, "og:video") ?? extractMetaContent(html, "og:video:url")
  if (ogVideo) return resolveUrl(url, ogVideo)

  const videoSrcs = extractVideoSrcs(html)
  if (videoSrcs.length > 0) return resolveUrl(url, videoSrcs[0] as string)

  const mediaLinks = extractMediaLinks(html)
  if (mediaLinks.length > 0) return resolveUrl(url, mediaLinks[0] as string)

  const ogImage = extractMetaContent(html, "og:image")
  if (ogImage) return resolveUrl(url, ogImage)

  const imgSrcs = extractImgSrcs(html)
  if (imgSrcs.length > 0) return resolveUrl(url, imgSrcs[0] as string)

  const twitterImage = extractMetaContent(html, "twitter:image")
  if (twitterImage) return resolveUrl(url, twitterImage)

  return null
}

// A 4xx from the page is a settled answer and isn't retried. Blocking statuses usually mean a bot
// wall (e.g. Vercel's Security Checkpoint) that no retry gets past, so say what to do instead.
const BLOCKED_STATUSES = new Set([401, 403, 429])

class PageFetchError extends Error {}

function pageFetchError(status: number): PageFetchError {
  return new PageFetchError(
    BLOCKED_STATUSES.has(status)
      ? "This site is blocking automatic fetches. Save the media from your browser and upload the file instead."
      : `Failed to fetch URL: ${status}`,
  )
}

// Collect UI's og:image is a generated share card (its generator currently 502s), but the card
// URL carries the design it was asked to render in an imageUrl parameter.
const COLLECTUI_HOSTS = new Set(["collectui.com", "www.collectui.com"])

async function fetchCollectUiMedia(url: string): Promise<FetchUrlResult | null> {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  if (!COLLECTUI_HOSTS.has(parsed.hostname)) return null

  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; Suipe/1.0)" } })
  if (!res.ok) throw pageFetchError(res.status)

  const html = await res.text()
  const card = extractMetaContent(html, "og:image") ?? extractMetaContent(html, "twitter:image")
  if (!card) return null

  let embedded: string | null = null
  try {
    embedded = new URL(card).searchParams.get("imageUrl")
  } catch {
    return null
  }
  if (!embedded) return null

  // What the card embeds is a still; the clip itself sits beside it without the thumbnail suffix.
  if (embedded.includes("-optimized-thumbnail.")) {
    const clip = await verifyMediaUrl(embedded.replace("-optimized-thumbnail.", "-optimized."))
    if (clip.mimeType.startsWith("video/")) return clip
  }

  return await verifyMediaUrl(embedded)
}

// X shows crawlers a still and nothing else: on a video post the og:image is an
// amplify_video_thumb frame and there is no og:video tag at all, so scraping the page can only
// ever yield the poster. The syndication endpoint behind embedded tweets does carry the clip.
const X_HOSTS = new Set([
  "x.com",
  "www.x.com",
  "twitter.com",
  "www.twitter.com",
  "mobile.twitter.com",
])
const X_STATUS_PATH = /\/status(?:es)?\/(\d+)/

// The endpoint returns an empty object unless a token is present, but never checks its value, so
// this is a literal rather than anything derived from X's embed widget. If X starts validating it,
// the response comes back empty and the caller gets the no-media error.
const X_SYNDICATION_TOKEN = "suipe"

interface SyndicationVariant {
  type?: string
  src?: string
}

interface SyndicationTweet {
  video?: { variants?: SyndicationVariant[] }
  photos?: Array<{ url?: string }>
  mediaDetails?: Array<{ media_url_https?: string }>
  user?: { name?: string; screen_name?: string; profile_image_url_https?: string }
}

// Variants are the same clip at several sizes, with the dimensions in the path. Take the largest.
//
// A grid cell only needs about 720px of resolution, but X's smaller variants are encoded at a much
// lower bitrate, and UI recordings are the worst case for that — flat fills band and fine text
// blocks up. The largest variant downscaled into a cell looks better than a smaller one shown at
// its native size, so this is about bits rather than pixels. It costs roughly 3.5x the bytes.
function bestMp4(variants: SyndicationVariant[]): string | null {
  let best: string | null = null
  let bestWidth = -1
  for (const variant of variants) {
    if (variant.type !== "video/mp4" || !variant.src) continue
    const width = Number(variant.src.match(/\/(\d+)x\d+\//)?.[1] ?? 0)
    if (width > bestWidth) {
      bestWidth = width
      best = variant.src
    }
  }
  return best
}

async function fetchXMedia(url: string): Promise<FetchUrlResult | null> {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  if (!X_HOSTS.has(parsed.hostname)) return null
  const id = parsed.pathname.match(X_STATUS_PATH)?.[1]
  if (!id) return null

  const endpoint = `https://cdn.syndication.twimg.com/tweet-result?id=${id}&token=${X_SYNDICATION_TOKEN}&lang=en`
  // Workers send no User-Agent by default and the endpoint answers 400 without one. This is our
  // own identifier, the same one the other handlers use — not X's embed widget.
  const res = await fetch(endpoint, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; Suipe/1.0)" },
  })
  // A deleted, private or suspended post answers 404 here rather than with an empty payload.
  if (res.status === 404) {
    throw new PageFetchError("That post is unavailable — it may be deleted, private or suspended.")
  }
  if (!res.ok) throw pageFetchError(res.status)

  const tweet = (await res.json()) as SyndicationTweet

  // Video and animated GIF both arrive as mp4 variants; a plain photo post has none.
  const variants = tweet.video?.variants
  const clip = variants ? bestMp4(variants) : null
  const photo = tweet.photos?.[0]?.url ?? tweet.mediaDetails?.[0]?.media_url_https
  const media = clip ?? photo

  // Deliberately not falling through to the generic scrape: that would "succeed" with the poster
  // frame, which is the exact thing this handler exists to avoid. An empty payload — which is what
  // a tokenless or rejected request returns — lands here too.
  if (!media) throw new PageFetchError("No media found on that post")

  const handle = tweet.user?.screen_name
  const name = tweet.user?.name
  // The payload carries the 48px thumbnail; the same path at _400x400 is the usable size.
  const avatar = tweet.user?.profile_image_url_https?.replace("_normal.", "_400x400.")
  return {
    ...(await verifyMediaUrl(media)),
    // Rebuilt from the post id rather than echoed back, so a mobile.twitter.com link, a tracking
    // query or an /i/status/ permalink all resolve to the one canonical post.
    ...(handle ? { sourceUrl: `https://x.com/${handle}/status/${id}` } : {}),
    ...(name ? { authorName: name } : {}),
    ...(handle ? { authorHandle: `@${handle}` } : {}),
    ...(avatar ? { authorAvatarUrl: avatar } : {}),
  }
}

// X answers 403 to any request carrying a Referer, which a browser always sends for media on a
// page. Workers send none, so we can fetch it server-side — but a page can never load it directly,
// in the upload preview or in the grid.
const NO_HOTLINK_HOSTS = new Set(["video.twimg.com", "pbs.twimg.com"])

function requiresRehost(url: string): boolean {
  try {
    return NO_HOTLINK_HOSTS.has(new URL(url).hostname)
  } catch {
    return false
  }
}

// A page that renders its media client-side may need several tries before a request lands on a
// backend that returns fully rendered HTML. Measured against Savee: ~50% of cold requests return
// the shell, so a handful of spaced attempts turns a coin flip into a near-certainty.
const PAGE_ATTEMPTS = 6
const PAGE_RETRY_DELAY_MS = 300

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function scrapePageOnce(url: string): Promise<FetchUrlResult | null> {
  const pageRes = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; Suipe/1.0)" },
  })
  if (!pageRes.ok) {
    // 4xx is a settled answer; 5xx and friends are worth another attempt.
    if (pageRes.status >= 400 && pageRes.status < 500) {
      throw pageFetchError(pageRes.status)
    }
    return null
  }

  const contentType = pageRes.headers.get("content-type") ?? ""
  const mediaMime = getMimeFromContentType(contentType)
  if (mediaMime) {
    return { url, mimeType: mediaMime }
  }

  const html = await pageRes.text()
  const mediaUrl = findPrimaryMediaUrl(url, html)
  if (!mediaUrl || isPlaceholderMedia(mediaUrl)) {
    return null
  }

  return await verifyMediaUrl(mediaUrl)
}

// recent.design is a client-rendered app: its item pages ship only the site-wide og.png, and the
// real media is loaded from their public oRPC API. Ask that API directly for the item's gallery.
const RECENT_ITEM_PATH = /^\/i\/([a-z0-9]+)(?:-[^/]*)?\/?$/i

interface RecentItem {
  media?: Array<{ url?: string }>
  cover?: { url?: string } | null
}

async function fetchRecentDesignMedia(url: string): Promise<FetchUrlResult | null> {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  if (parsed.hostname !== "recent.design" && parsed.hostname !== "www.recent.design") return null
  const id = parsed.pathname.match(RECENT_ITEM_PATH)?.[1]
  if (!id) return null

  const res = await fetch("https://api.recent.design/rpc/items/byId", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ json: { id } }),
  })
  if (!res.ok) throw pageFetchError(res.status)

  const data = (await res.json()) as { json?: RecentItem }
  const mediaUrl = data.json?.media?.[0]?.url ?? data.json?.cover?.url
  if (!mediaUrl) throw new Error("No media found on page")

  return await verifyMediaUrl(mediaUrl)
}

async function resolveUrlMedia(url: string): Promise<FetchUrlResult> {
  const recent = await fetchRecentDesignMedia(url)
  if (recent) return recent

  const collectUi = await fetchCollectUiMedia(url)
  if (collectUi) return collectUi

  const x = await fetchXMedia(url)
  if (x) return x

  const ext = getExtensionFromUrl(url)
  if (ext) {
    return await verifyMediaUrl(url)
  }

  for (let attempt = 1; attempt <= PAGE_ATTEMPTS; attempt++) {
    let result: FetchUrlResult | null = null
    try {
      result = await scrapePageOnce(url)
    } catch (e) {
      // A 4xx is final; anything else (network blip) gets retried.
      if (e instanceof PageFetchError) throw e
      if (attempt === PAGE_ATTEMPTS) throw e
    }
    if (result) return result
    if (attempt < PAGE_ATTEMPTS) await delay(PAGE_RETRY_DELAY_MS)
  }

  throw new Error("No media found on page")
}

export async function fetchUrlMedia(url: string): Promise<FetchUrlResult> {
  const result = await resolveUrlMedia(url)
  return requiresRehost(result.url) ? { ...result, rehostRequired: true } : result
}
