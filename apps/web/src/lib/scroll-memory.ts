// Opening a swipe replaces the grid rather than covering it, so coming back mounts a fresh grid at
// the top. Remember where the page was and put it back, keyed by route so browse and faves do not
// overwrite each other. In memory on purpose: a reload should start at the top.
const positions = new Map<string, number>()

export function rememberScroll(key: string): void {
  positions.set(key, window.scrollY)
}

export function takeScroll(key: string): number {
  const y = positions.get(key) ?? 0
  positions.delete(key)
  return y
}
