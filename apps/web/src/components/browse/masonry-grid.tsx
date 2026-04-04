import type { Swipe } from "@suipe/schemas"
import { useCallback, useMemo, useRef, useSyncExternalStore } from "react"
import { SwipeCard } from "./swipe-card"

interface MasonryGridProps {
  swipes: Swipe[]
  onSelect: (swipe: Swipe) => void
}

const GAP = 16

function getColumnCount(width: number): number {
  if (width >= 1280) return 4
  if (width >= 768) return 3
  return 2
}

/**
 * Distributes items into columns incrementally — each item is assigned a column
 * exactly once (keyed by id) and never moves. New items are placed into the
 * shortest column using tracked pixel heights, so the grid stays balanced as
 * pages are appended. A unit-height placeholder (1) is used until the
 * ResizeObserver updates columnHeights with the real rendered value.
 */
function distributeIncrementally(
  items: Swipe[],
  columnCount: number,
  assignments: Map<string, number>,
  columnHeights: number[],
): Swipe[][] {
  while (columnHeights.length < columnCount) columnHeights.push(0)

  for (const item of items) {
    if (!assignments.has(item.id)) {
      let shortest = 0
      for (let i = 1; i < columnCount; i++) {
        if ((columnHeights[i] ?? 0) < (columnHeights[shortest] ?? 0)) shortest = i
      }
      assignments.set(item.id, shortest)
      columnHeights[shortest] = (columnHeights[shortest] ?? 0) + 1
    }
  }

  const columns: Swipe[][] = Array.from({ length: columnCount }, () => [])
  for (const item of items) {
    const col = assignments.get(item.id) ?? 0
    columns[col]?.push(item)
  }
  return columns
}

function useContainerWidth(ref: React.RefObject<HTMLDivElement | null>): number {
  const widthRef = useRef(0)

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!ref.current) return () => {}
      const observer = new ResizeObserver((entries) => {
        const entry = entries[0]
        if (!entry) return
        const newWidth = entry.contentRect.width
        if (newWidth !== widthRef.current) {
          widthRef.current = newWidth
          onStoreChange()
        }
      })
      // Seed initial width
      widthRef.current = ref.current.offsetWidth
      observer.observe(ref.current)
      return () => observer.disconnect()
    },
    [ref],
  )

  const getSnapshot = useCallback(() => widthRef.current, [])

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function MasonryGrid({ swipes, onSelect }: MasonryGridProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const width = useContainerWidth(containerRef)
  const columnCount = getColumnCount(width)

  // Persistent assignment state — survives page appends, resets on columnCount change
  const assignmentsRef = useRef<Map<string, number>>(new Map())
  const columnHeightsRef = useRef<number[]>([])
  const prevColumnCountRef = useRef(0)

  if (prevColumnCountRef.current !== columnCount) {
    prevColumnCountRef.current = columnCount
    assignmentsRef.current.clear()
    columnHeightsRef.current = []
  }

  // When swipes empties (e.g. query key changed while new results load), clear
  // stale assignments so the incoming set gets a fresh distribution.
  if (swipes.length === 0) {
    assignmentsRef.current.clear()
    columnHeightsRef.current = []
  }

  const columns = distributeIncrementally(
    swipes,
    columnCount,
    assignmentsRef.current,
    columnHeightsRef.current,
  )

  // Stable React 19 callback refs per column — update columnHeightsRef with actual px heights
  const colRefs = useMemo(
    () =>
      Array.from({ length: columnCount }, (_, i) => (el: HTMLDivElement | null) => {
        if (!el) return
        const observer = new ResizeObserver((entries) => {
          const h = entries[0]?.contentRect.height
          if (h !== undefined) columnHeightsRef.current[i] = h
        })
        observer.observe(el)
        return () => observer.disconnect()
      }),
    [columnCount],
  )

  if (swipes.length === 0) {
    return <p className="py-20 text-center text-gray-400">No swipes yet</p>
  }

  return (
    <div
      ref={containerRef}
      className="grid items-start"
      style={{ gridTemplateColumns: `repeat(${columnCount}, 1fr)`, gap: GAP }}
    >
      {columns.map((col, colIndex) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: stable column order
        <div key={colIndex} ref={colRefs[colIndex]} className="flex flex-col" style={{ gap: GAP }}>
          {col.map((swipe) => (
            <SwipeCard key={swipe.id} swipe={swipe} onSelect={onSelect} />
          ))}
        </div>
      ))}
    </div>
  )
}
