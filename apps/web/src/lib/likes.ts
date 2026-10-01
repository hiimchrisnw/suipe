// Saves have no backend yet, so likes live here for the session. Keeping them outside the cards
// means a heart survives filter changes, which remount the whole grid.
const liked = new Set<string>()
const listeners = new Set<() => void>()

export function toggleLike(id: string): void {
  if (liked.has(id)) {
    liked.delete(id)
  } else {
    liked.add(id)
  }
  for (const listener of listeners) listener()
}

export function isLiked(id: string): boolean {
  return liked.has(id)
}

export function subscribeLikes(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
