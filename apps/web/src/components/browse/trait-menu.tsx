import { MAX_TRAITS } from "@suipe/schemas"
import { useEffect, useLayoutEffect, useRef, useState } from "react"
import crossIcon from "../../assets/cross.svg"
import crossThinIcon from "../../assets/cross-thin.svg"
import { useSelectedTraits } from "../../hooks/use-selected-traits"
import { useTags } from "../../hooks/use-tags"
import { navigate } from "../../lib/router"

function buildEmotionsUrl(next: string[]): string {
  const url = new URL(window.location.href)
  if (next.length === 0) {
    url.searchParams.delete("emotions")
  } else {
    url.searchParams.set("emotions", next.join(","))
  }
  return url.pathname + url.search
}

// The row sits at the bar's size, shrinking only when long traits would overrun the content width.
const ROW_FONT_PX = 16
const MIN_ROW_FONT_PX = 10.5

export function TraitMenu() {
  const emotions = useSelectedTraits()
  const [isOpen, setIsOpen] = useState(false)
  const { data: allTags } = useTags()

  const containerRef = useRef<HTMLDivElement>(null)
  const [rowFontPx, setRowFontPx] = useState(ROW_FONT_PX)

  // legitimate-useeffect: measures laid-out text, which only exists after a render
  useLayoutEffect(() => {
    const row = containerRef.current
    const cell = row?.parentElement
    const nav = row?.closest("nav")
    if (!row || !cell || !nav) return

    const fit = () => {
      const navStyle = getComputedStyle(nav)
      const padding =
        Number.parseFloat(navStyle.paddingLeft) + Number.parseFloat(navStyle.paddingRight)
      const siblings = [...nav.children].filter((child) => child !== cell) as HTMLElement[]
      // Below md the row drops onto its own line and has the full width to itself.
      const sharesLine = siblings.some((child) => child.offsetTop === cell.offsetTop)
      const taken = sharesLine
        ? siblings.reduce((total, child) => total + child.getBoundingClientRect().width, 0) + 24
        : 0
      const available = nav.clientWidth - padding - taken
      const natural = row.scrollWidth
      if (available <= 0 || natural <= 0) return

      const current = Number.parseFloat(getComputedStyle(row).fontSize)
      const target = Math.min(
        ROW_FONT_PX,
        Math.max(MIN_ROW_FONT_PX, (current * available) / natural),
      )
      setRowFontPx((previous) => (Math.abs(previous - target) > 0.25 ? target : previous))
    }

    fit()
    // Watching the row as well as the bar: adding or removing a chip resizes it, which refits.
    const observer = new ResizeObserver(fit)
    observer.observe(nav)
    observer.observe(row)
    return () => observer.disconnect()
  }, [])

  // legitimate-useeffect: while the menu is down it owns the page's clicks and keys
  useEffect(() => {
    if (!isOpen) return

    // Capture phase, so a click outside closes the menu and goes no further — otherwise it also
    // lands on whatever is behind it, opening a swipe.
    const onClick = (e: MouseEvent) => {
      if (containerRef.current?.contains(e.target as Node)) return
      e.preventDefault()
      e.stopPropagation()
      setIsOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false)
    }
    document.addEventListener("click", onClick, true)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("click", onClick, true)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [isOpen])

  // legitimate-useeffect: the open menu owns the viewport, so the page behind it must not scroll
  useEffect(() => {
    if (!isOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previous
    }
  }, [isOpen])

  function handleToggleTag(tag: string) {
    const next = emotions.includes(tag) ? emotions.filter((e) => e !== tag) : [...emotions, tag]
    navigate(buildEmotionsUrl(next))
  }

  function handleRemoveTag(tag: string) {
    navigate(buildEmotionsUrl(emotions.filter((e) => e !== tag)))
  }

  return (
    // Static on purpose: the menu below is positioned against the <nav>, so it spans the page.
    <div ref={containerRef} style={{ fontSize: `${rowFontPx}px` }} className="flex items-center">
      {emotions.map((emotion) => (
        <button
          key={emotion}
          type="button"
          onClick={() => handleRemoveTag(emotion)}
          // -mr-px: neighbouring pills share one rule rather than sitting apart.
          className="-mr-px flex shrink-0 items-center justify-center gap-[0.44em] rounded-full border border-paper px-[0.875em] py-[0.22em] text-paper hover:opacity-70"
          aria-label={`Remove ${emotion}`}
        >
          {emotion}
          <img src={crossIcon} alt="" className="h-[0.73em] w-[0.74em] opacity-30" />
        </button>
      ))}

      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        // At the cap there is nothing left to add, but the menu must still be closable.
        disabled={emotions.length >= MAX_TRAITS && !isOpen}
        className={`flex shrink-0 items-center justify-center gap-[0.44em] rounded-full border text-paper hover:opacity-70 disabled:opacity-30 disabled:hover:opacity-30 ${
          emotions.length > 0
            ? "border-paper size-[2.06em]"
            : "border-paper/30 border-dashed px-[0.875em] py-[0.22em]"
        }`}
        aria-expanded={isOpen}
      >
        {emotions.length === 0 && <span>Filter by traits</span>}
        {/* The asset is a cross; rotating it reads as a plus until the menu is open. */}
        <img
          src={crossIcon}
          alt=""
          className={`transition-transform duration-300 ${"h-[0.73em] w-[0.74em]"} ${isOpen ? "" : "-rotate-45"}`}
        />
      </button>

      {/* Always mounted inside a clipping wrapper so the panel can slide both ways. */}
      <div
        className={`absolute inset-x-4 top-full z-40 overflow-hidden md:inset-x-7 ${
          isOpen ? "" : "pointer-events-none"
        }`}
        inert={!isOpen}
      >
        <div
          className={`h-[calc(100dvh-var(--nav-h,120px))] overflow-hidden bg-ink pb-4 transition-transform duration-300 ease-out md:h-auto md:overflow-visible md:pb-7 ${
            isOpen ? "translate-y-0" : "-translate-y-full"
          }`}
        >
          {/* A rule-coloured bed showing through 1px gaps: one crisp line everywhere, no doubling. */}
          <div className="grid h-full grid-flow-col grid-cols-2 grid-rows-8 gap-px bg-rule p-px md:h-auto lg:grid-cols-4 lg:grid-rows-4">
            {(allTags ?? []).map((tag) => {
              const isSelected = emotions.includes(tag)
              const isBlocked = !isSelected && emotions.length >= MAX_TRAITS
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleToggleTag(tag)}
                  disabled={isBlocked}
                  className={`relative flex items-center gap-3 bg-ink px-5 py-3 text-left font-semibold text-[clamp(20px,5.2vw,44px)] tracking-[-0.03em] transition-colors duration-200 md:px-6 md:py-5 lg:px-7 lg:py-6 lg:text-[clamp(26px,2.8vw,58px)] ${
                    isSelected ? "z-10" : ""
                  } ${isBlocked ? "text-paper/30" : "text-paper"}`}
                  aria-pressed={isSelected}
                >
                  {/* The pill: radius and colour animate in over the cell's own rules. */}
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none absolute -inset-px border transition-[border-radius,border-color] duration-150 ease-out ${
                      isSelected ? "rounded-[64px] border-white" : "rounded-none border-transparent"
                    }`}
                  />
                  {tag}
                  {isSelected && (
                    <img
                      src={crossThinIcon}
                      alt=""
                      className="relative ml-auto size-[clamp(15px,3.8vw,30px)] shrink-0 opacity-30 lg:size-[clamp(18px,1.8vw,34px)]"
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
