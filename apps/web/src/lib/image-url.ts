export function getImageUrl(key: string): string {
  return `${import.meta.env.VITE_API_URL}/assets/${key}`
}
