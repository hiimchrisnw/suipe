import { useSyncExternalStore } from "react"

// The admin passphrase is typed in once per device at /admin and kept in that browser. It never
// lives in the code, because the bundle is public. Without it the API refuses every write, and the
// site hides the controls that would need it.
const STORAGE_KEY = "suipe-admin-key"
const listeners = new Set<() => void>()

function read(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function getAdminKey(): string | null {
  return read()
}

export function setAdminKey(key: string | null): void {
  try {
    if (key) window.localStorage.setItem(STORAGE_KEY, key)
    else window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Private mode or blocked storage: the key simply doesn't stick on this device.
  }
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useIsAdmin(): boolean {
  return useSyncExternalStore(subscribe, () => read() !== null, () => false)
}

export function adminHeaders(): Record<string, string> {
  const key = read()
  return key ? { "X-Admin-Key": key } : {}
}

// A write sent with a stale or wrong key comes back 401. Dropping the key there returns this
// device to the visitor view rather than leaving controls that can't work.
export async function adminFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(input, {
    ...init,
    headers: { ...(init.headers as Record<string, string> | undefined), ...adminHeaders() },
  })
  if (res.status === 401) setAdminKey(null)
  return res
}
