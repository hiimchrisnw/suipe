import type { Swipe } from "@suipe/schemas"
import { useCallback, useRef, useSyncExternalStore } from "react"
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
 * Distributes items into columns by always placing the next item
 * into the shortest column — producing a Pinterest-style layout.
 */
function distributeItems<T>(items: T[], columnCount: number): T[][] {
  const columns: T[][] = Array.from({ length: columnCount }, () => [])
  const heights = new Array<number>(columnCount).fill(0)

  for (const item of items) {
    let shortest = 0
    for (let i = 1; i < columnCount; i++) {
      if ((heights[i] ?? 0) < (heights[shortest] ?? 0)) shortest = i
    }
    columns[shortest]?.push(item)
    heights[shortest] = (heights[shortest] ?? 0) + 1
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
  const columns = distributeItems(swipes, columnCount)

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
        <div key={colIndex} className="flex flex-col" style={{ gap: GAP }}>
          {col.map((swipe) => (
            <SwipeCard key={swipe.id} swipe={swipe} onSelect={onSelect} />
          ))}
        </div>
      ))}
    </div>
  )
}
