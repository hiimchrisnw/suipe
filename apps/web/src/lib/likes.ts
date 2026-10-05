// Saves live in this browser. No account, no sync — the ids are kept in localStorage and the
// faves page asks the API for those swipes by id. The tradeoff is that saves do not follow anyone
// to another browser or device, and clearing site data clears them.
const STORAGE_KEY = "suipe-likes"

// Ordered, newest first, so the faves grid can show the most recently saved at the top.
let liked: string[] = read()
const listeners = new Set<() => void>()

function read(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : []
  } catch {
    // Private mode, blocked storage, or something else wrote nonsense here.
    return []
  }
}

function write(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(liked))
  } catch {
    // Storage is unavailable or full: the likes still work for this session.
  }
}

export function toggleLike(id: string): void {
  liked = liked.includes(id) ? liked.filter((x) => x !== id) : [id, ...liked]
  write()
  for (const listener of listeners) listener()
}

export function isLiked(id: string): boolean {
  return liked.includes(id)
}

// A stable reference while nothing changes, so useSyncExternalStore does not loop.
export function getLikedIds(): string[] {
  return liked
}

export function subscribeLikes(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
