import type { Swipe } from "@suipe/schemas"
import { useCallback } from "react"
import { createPortal } from "react-dom"
import { getImageUrl } from "../../lib/image-url"

interface SwipeModalProps {
  swipe: Swipe
  onClose: () => void
}

export function SwipeModal({ swipe, onClose }: SwipeModalProps) {
  const handleBackdropKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    },
    [onClose],
  )

  return createPortal(
    <div
      role="dialog"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      onKeyDown={handleBackdropKeyDown}
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: stopPropagation prevents modal close when clicking content */}
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {swipe.mediaType === "video" ? (
          // biome-ignore lint/a11y/useMediaCaption: user-uploaded videos don't have caption tracks
          <video src={getImageUrl(swipe.imageUrl)} controls className="w-full rounded-lg" />
        ) : (
          <img
            src={getImageUrl(swipe.imageUrl)}
            alt={swipe.description ?? ""}
            className="w-full rounded-lg"
          />
        )}
        <div className="mt-4 space-y-3">
          {swipe.description && <p className="text-gray-700">{swipe.description}</p>}
          {swipe.sourceUrl && (
            <a
              href={swipe.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              {swipe.sourceUrl}
            </a>
          )}
          {swipe.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {swipe.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
