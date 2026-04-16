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

export async function fetchUrlMedia(url: string): Promise<FetchUrlResult> {
  const ext = getExtensionFromUrl(url)
  if (ext) {
    return await verifyMediaUrl(url)
  }

  const pageRes = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; Suipe/1.0)" },
  })
  if (!pageRes.ok) {
    throw new Error(`Failed to fetch URL: ${pageRes.status}`)
  }

  const contentType = pageRes.headers.get("content-type") ?? ""
  const mediaMime = getMimeFromContentType(contentType)
  if (mediaMime) {
    return { url, mimeType: mediaMime }
  }

  const html = await pageRes.text()
  const mediaUrl = findPrimaryMediaUrl(url, html)
  if (!mediaUrl) {
    throw new Error("No media found on page")
  }

  return await verifyMediaUrl(mediaUrl)
}
