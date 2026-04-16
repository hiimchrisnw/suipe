import { useRef, useState } from "react"

interface DropZoneProps {
  onFileSelect: (file: File) => void
  preview: string | null
  isVideo: boolean
  overlay?: React.ReactNode
}

export function DropZone({ onFileSelect, preview, isVideo, overlay }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave() {
    setIsDragging(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) onFileSelect(file)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) onFileSelect(file)
  }

  return (
    <button
      type="button"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`flex min-h-48 w-full cursor-pointer items-center justify-center rounded-xl border-2 border-dashed transition-colors ${
        isDragging ? "border-gray-900 bg-gray-50" : "border-gray-300 hover:border-gray-400"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/mp4,video/webm,video/quicktime"
        onChange={handleChange}
        className="hidden"
      />
      {preview ? (
        <div className="relative inline-block">
          {isVideo ? (
            <video src={preview} muted autoPlay loop className="block max-h-80 rounded-lg" />
          ) : (
            <img src={preview} alt="Preview" className="block max-h-80 rounded-lg" />
          )}
          {overlay}
        </div>
      ) : (
        <p className="text-base font-normal text-gray-400">Drop a file here, or click to select</p>
      )}
    </button>
  )
}
