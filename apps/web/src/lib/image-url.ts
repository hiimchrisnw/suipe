export function getMediaUrl(swipe: { imageUrl: string; sourceType: string }): string {
  if (swipe.sourceType === "external") return swipe.imageUrl
  return `${import.meta.env.VITE_API_URL}/assets/${swipe.imageUrl}`
}
