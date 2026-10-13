import { useSyncExternalStore } from "react"

function subscribe(cb: () => void) {
  window.addEventListener("popstate", cb)
  return () => window.removeEventListener("popstate", cb)
}

export function usePathname(): string {
  return useSyncExternalStore(subscribe, () => window.location.pathname)
}

export function useSearchParam(key: string): string | null {
  return useSyncExternalStore(subscribe, () => new URLSearchParams(window.location.search).get(key))
}

// Keeps whatever else is in the query — the trait filter lives there too — so opening a swipe
// does not drop the recipe someone is browsing under.
export function setSearchParam(key: string, value: string | null): void {
  const params = new URLSearchParams(window.location.search)
  if (value === null) params.delete(key)
  else params.set(key, value)
  const query = params.toString()
  navigate(query ? `${window.location.pathname}?${query}` : window.location.pathname)
}

export function useSearchParamArray(key: string): string[] {
  const raw = useSyncExternalStore(
    subscribe,
    () => new URLSearchParams(window.location.search).get(key) ?? "",
  )
  if (!raw) return []
  return raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
}

export function navigate(path: string) {
  window.history.pushState(null, "", path)
  window.dispatchEvent(new PopStateEvent("popstate"))
}
