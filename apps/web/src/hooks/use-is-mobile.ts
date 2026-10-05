import { useCallback, useSyncExternalStore } from "react"

// Matches Tailwind's md breakpoint. Used where the two layouts need genuinely different DOM rather
// than different styling — the page title sits inside the sticky bar on phones and in the page
// body on desktop, and it must only ever be mounted once.
const QUERY = "(max-width: 767px)"

export function useIsMobile(): boolean {
  const subscribe = useCallback((onChange: () => void) => {
    const mql = window.matchMedia(QUERY)
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  )
}
