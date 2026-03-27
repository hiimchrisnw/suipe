import { useSyncExternalStore } from "react"

function subscribe(cb: () => void) {
  window.addEventListener("popstate", cb)
  return () => window.removeEventListener("popstate", cb)
}

export function usePathname(): string {
  return useSyncExternalStore(subscribe, () => window.location.pathname)
}

export function useSearchParam(key: string): string | undefined {
  const value = useSyncExternalStore(
    subscribe,
    () => new URLSearchParams(window.location.search).get(key) ?? "",
  )
  return value || undefined
}

export function navigate(path: string) {
  window.history.pushState(null, "", path)
  window.dispatchEvent(new PopStateEvent("popstate"))
}
