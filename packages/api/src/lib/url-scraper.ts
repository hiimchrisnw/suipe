interface FetchUrlResult {
  url: string
  mimeType: string
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
      throw new Error(`Failed to fetch URL: ${pageRes.status}`)
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

export async function fetchUrlMedia(url: string): Promise<FetchUrlResult> {
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
      if (e instanceof Error && e.message.startsWith("Failed to fetch URL:")) throw e
      if (attempt === PAGE_ATTEMPTS) throw e
    }
    if (result) return result
    if (attempt < PAGE_ATTEMPTS) await delay(PAGE_RETRY_DELAY_MS)
  }

  throw new Error("No media found on page")
}
