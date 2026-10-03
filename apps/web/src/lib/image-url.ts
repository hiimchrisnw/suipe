export function getMediaUrl(swipe: { imageUrl: string; sourceType: string }): string {
  if (swipe.sourceType === "external") return swipe.imageUrl
  return `${import.meta.env.VITE_API_URL}/assets/${swipe.imageUrl}`
}

// The site the swipe came from, as a bare domain ("savee.com"), or null when there isn't one.
export function getSourceDomain(sourceUrl: string | null): string | null {
  if (!sourceUrl) return null
  try {
    return new URL(sourceUrl).hostname.replace(/^www\./, "")
  } catch {
    return null
  }
}

export function getFaviconUrl(domain: string): string {
  return `${import.meta.env.VITE_API_URL}/favicons/${domain}`
}
