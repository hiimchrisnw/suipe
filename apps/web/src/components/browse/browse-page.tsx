import type { Swipe } from "@suipe/schemas"
import { useQueryClient } from "@tanstack/react-query"
import { useCallback, useEffect, useRef } from "react"
import { useIsMobile } from "../../hooks/use-is-mobile"
import { useSelectedTraits } from "../../hooks/use-selected-traits"
import { useSwipes } from "../../hooks/use-swipes"
import { setSearchParam } from "../../lib/router"
import { rememberScroll, takeScroll } from "../../lib/scroll-memory"
import { PageTitle } from "./page-title"
import { SwipeCard } from "./swipe-card"

// Enough to fill a large screen; the real grid replaces them as soon as the first page lands.
const SKELETON_COUNT = 12

export const GRID_CLASS = "grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"

export function BrowsePage() {
  const emotions = useSelectedTraits()
  const isMobile = useIsMobile()
  const { data, isLoading, isPlaceholderData, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSwipes(emotions.length > 0 ? emotions : undefined)
  const queryClient = useQueryClient()

  const swipes = data?.pages.flat() ?? []

  // legitimate-useeffect: put the page back where it was before a swipe was opened, once there is
  // something to scroll through. Runs once, and takes the value so a later visit starts at the top.
  const restoredRef = useRef(false)
  useEffect(() => {
    if (restoredRef.current || swipes.length === 0) return
    restoredRef.current = true
    const y = takeScroll("browse")
    if (y > 0) window.scrollTo({ top: y, behavior: "instant" })
  }, [swipes.length])
  // The grid already holds the row, so hand it to the detail view's query rather than making it
  // fetch what is on screen.
  function openSwipe(swipe: Swipe) {
    rememberScroll("browse")
    queryClient.setQueryData(["swipes-by-ids", swipe.id], [swipe])
    setSearchParam("swipe", swipe.id)
  }

  // React 19 callback ref — returns cleanup function, no useEffect needed
  const sentinelRef = useCallback(
    (el: HTMLDivElement | null) => {
      if (!el) return
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
            fetchNextPage()
          }
        },
        { rootMargin: "400px", threshold: 0 },
      )
      observer.observe(el)
      return () => observer.disconnect()
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage],
  )

  return (
    <div className="px-3 pt-6 pb-3 md:px-7 md:pt-8 md:pb-7">
      {/* On phones this lives in the sticky bar instead, above the trait chip. */}
      {!isMobile && <PageTitle />}
      {isLoading ? (
        <div className={GRID_CLASS}>
          {Array.from({ length: SKELETON_COUNT }, (_, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length placeholder list
              key={i}
              className="skeleton aspect-square w-full rounded-[16px]"
            />
          ))}
        </div>
      ) : swipes.length === 0 && emotions.length > 0 ? (
        <p className="py-20 text-center text-paper/40">
          No swipes match this combination. Try removing a trait.
        </p>
      ) : (
        <div
          className={`${GRID_CLASS} transition-opacity duration-300 ease-out ${
            isPlaceholderData ? "opacity-40" : "opacity-100"
          }`}
        >
          {swipes.map((swipe) => (
            <SwipeCard key={swipe.id} swipe={swipe} onSelect={openSwipe} />
          ))}
        </div>
      )}
      <div ref={sentinelRef} aria-hidden="true" />
      {isFetchingNextPage && <p className="py-4 text-center text-paper/40">Loading more...</p>}
    </div>
  )
}
