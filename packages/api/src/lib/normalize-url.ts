// The same page gets pasted in cosmetically different forms: with or without www, http or https,
// a trailing slash, tracking params, a #fragment. Reduce a URL to the parts that identify the page
// so the duplicate check compares pages rather than exact strings.
const TRACKING_PARAMS = new Set([
  "dclid",
  "fbclid",
  "gclid",
  "igshid",
  "mc_cid",
  "mc_eid",
  "msclkid",
  "ref",
  "ref_src",
])

function isTrackingParam(key: string): boolean {
  const k = key.toLowerCase()
  return k.startsWith("utm_") || TRACKING_PARAMS.has(k)
}

export function normalizeUrl(raw: string): string {
  const trimmed = raw.trim()
  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    // Not an absolute URL (e.g. an R2 object key); compare it as-is.
    return trimmed
  }

  const host = url.host.toLowerCase().replace(/^www\./, "")
  const path = url.pathname.replace(/\/+$/, "")
  const params = [...url.searchParams]
    .filter(([key]) => !isTrackingParam(key))
    .sort(([a, av], [b, bv]) => a.localeCompare(b) || av.localeCompare(bv))
  const query = new URLSearchParams(params).toString()

  return `${host}${path}${query ? `?${query}` : ""}`
}
