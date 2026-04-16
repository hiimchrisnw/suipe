import { useRef } from "react"

interface FocalPickerProps {
  x: number
  y: number
  onChange: (x: number, y: number) => void
  onDragEnd?: (x: number, y: number) => void
}

function clamp(n: number): number {
  return Math.min(100, Math.max(0, n))
}

export function FocalPicker({ x, y, onChange, onDragEnd }: FocalPickerProps) {
  const handleRef = useRef<HTMLButtonElement>(null)
  const latestRef = useRef({ x, y })
  latestRef.current = { x, y }

  function compute(clientX: number, clientY: number): { x: number; y: number } | null {
    const parent = handleRef.current?.parentElement
    if (!parent) return null
    const rect = parent.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return null
    return {
      x: clamp(((clientX - rect.left) / rect.width) * 100),
      y: clamp(((clientY - rect.top) / rect.height) * 100),
    }
  }

  function handlePointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    e.preventDefault()
    e.stopPropagation()
    const target = e.currentTarget
    target.setPointerCapture(e.pointerId)

    const point = compute(e.clientX, e.clientY)
    if (point) {
      onChange(point.x, point.y)
      latestRef.current = point
    }
  }

  function handlePointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
    const point = compute(e.clientX, e.clientY)
    if (point) {
      onChange(point.x, point.y)
      latestRef.current = point
    }
  }

  function handlePointerUp(e: React.PointerEvent<HTMLButtonElement>) {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
    e.currentTarget.releasePointerCapture(e.pointerId)
    onDragEnd?.(latestRef.current.x, latestRef.current.y)
  }

  return (
    <button
      ref={handleRef}
      type="button"
      aria-label="Focal point"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onClick={(e) => e.stopPropagation()}
      className="absolute z-10 h-6 w-6 -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none rounded-full border-2 border-white bg-white/30 shadow-[0_0_0_1px_rgba(0,0,0,0.4)] backdrop-blur-sm active:cursor-grabbing"
      style={{ left: `${x}%`, top: `${y}%` }}
    />
  )
}
