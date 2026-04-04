import { useCallback, useRef, useSyncExternalStore } from "react"

export function useIsVisible(
  ref: React.RefObject<Element | null>,
  options?: IntersectionObserverInit,
): boolean {
  const visibleRef = useRef(false)

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!ref.current) return () => {}
      const observer = new IntersectionObserver((entries) => {
        const next = entries[0]?.isIntersecting ?? false
        if (next !== visibleRef.current) {
          visibleRef.current = next
          onStoreChange()
        }
      }, options)
      observer.observe(ref.current)
      return () => observer.disconnect()
    },
    [ref, options],
  )

  const getSnapshot = useCallback(() => visibleRef.current, [])
  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
