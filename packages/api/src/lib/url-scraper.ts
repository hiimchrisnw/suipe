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

async function verifyMediaUrl(url: string): Promise<FetchUrlResult | null> {
  const res = await fetch(url, { method: "HEAD" })
  if (!res.ok) return null

  const contentType = res.headers.get("content-type") ?? ""
  const mime = getMimeFromContentType(contentType)
  if (!mime) return null

  return { url, mimeType: mime }
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
    if (match?.[1]) return match[1]
  }
  return null
}

function extractImgSrcs(html: string): string[] {
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi
  const srcs: string[] = []
  for (const match of html.matchAll(imgRegex)) {
    if (match[1]) srcs.push(match[1])
  }
  return srcs
}

function resolveUrl(base: string, relative: string): string {
  try {
    return new URL(relative, base).href
  } catch {
    return relative
  }
}

function findPrimaryImageUrl(url: string, html: string): string | null {
  const ogImage = extractMetaContent(html, "og:image")
  if (ogImage) return resolveUrl(url, ogImage)

  const imgSrcs = extractImgSrcs(html)
  if (imgSrcs.length > 0) {
    return resolveUrl(url, imgSrcs[0] as string)
  }

  const twitterImage = extractMetaContent(html, "twitter:image")
  if (twitterImage) return resolveUrl(url, twitterImage)

  return null
}

export async function fetchUrlMedia(url: string): Promise<FetchUrlResult> {
  const ext = getExtensionFromUrl(url)
  if (ext) {
    const result = await verifyMediaUrl(url)
    if (result) return result
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
  const imageUrl = findPrimaryImageUrl(url, html)
  if (!imageUrl) {
    throw new Error("No image found on page")
  }

  const verified = await verifyMediaUrl(imageUrl)
  if (!verified) {
    throw new Error("Failed to verify image from page")
  }

  return verified
}
