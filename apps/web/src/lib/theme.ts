// The palette is semantic — ink is the surface, paper the colour on it — so a theme is a token
// swap on the root element rather than a second set of styles.
type Theme = "dark" | "light"

const STORAGE_KEY = "suipe-theme"
const listeners = new Set<() => void>()

export function getTheme(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark"
}

const SWITCH_MS = 320

export function toggleTheme(): void {
  const next: Theme = getTheme() === "dark" ? "light" : "dark"
  const root = document.documentElement
  const wantsMotion = !matchMedia("(prefers-reduced-motion: reduce)").matches

  if (wantsMotion) {
    root.classList.add("theme-switching")
    window.setTimeout(() => root.classList.remove("theme-switching"), SWITCH_MS)
  }

  root.dataset.theme = next
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // A refused write only costs the preference on the next visit.
  }
  for (const listener of listeners) listener()
}

export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
