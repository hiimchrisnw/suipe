import { MAX_TRAITS } from "@suipe/schemas"
import { startTransition, useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
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

// The exported crosses carry a baked-in white stroke, so an <img> can't follow the theme. Masking
// keeps Figma's exact geometry while the colour comes from the element's own text colour.
function CrossMark({ src, className }: { src: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      style={{ maskImage: `url("${src}")`, WebkitMaskImage: `url("${src}")` }}
      className={`cross-mark inline-block bg-current [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain] ${className ?? ""}`}
    />
  )
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

  // legitimate-useeffect: the grid behind the menu is hidden but still decoding video, and the
  // bar's blur re-samples it every frame. Both are wasted work while the menu is down.
  useEffect(() => {
    if (!isOpen) return
    const nav = containerRef.current?.closest("nav")
    nav?.setAttribute("data-menu-open", "true")

    const videos = [...document.querySelectorAll("video")].filter((video) => !video.paused)
    for (const video of videos) video.pause()

    return () => {
      nav?.removeAttribute("data-menu-open")
      for (const video of videos) void video.play().catch(() => {})
    }
  }, [isOpen])

  function handleToggleTag(tag: string) {
    const next = emotions.includes(tag) ? emotions.filter((e) => e !== tag) : [...emotions, tag]
    // Non-urgent: the pill animation gets the frames first, the grid catches up behind it.
    startTransition(() => navigate(buildEmotionsUrl(next)))
  }

  function handleRemoveTag(tag: string) {
    startTransition(() => navigate(buildEmotionsUrl(emotions.filter((e) => e !== tag))))
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
          <CrossMark src={crossIcon} className="h-[0.73em] w-[0.74em] opacity-30" />
        </button>
      ))}

      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className={`flex shrink-0 items-center justify-center gap-[0.44em] rounded-full border text-paper hover:opacity-70 ${
          emotions.length > 0
            ? "border-paper size-[2.06em]"
            : "border-paper/30 border-dashed px-[0.875em] py-[0.22em]"
        }`}
        aria-expanded={isOpen}
      >
        {emotions.length === 0 && <span>Filter by traits</span>}
        {/* The asset is a cross; rotating it reads as a plus until the menu is open. */}
        <CrossMark
          src={crossIcon}
          className={`transition-transform duration-300 h-[0.73em] w-[0.74em] ${isOpen ? "" : "-rotate-45"}`}
        />
      </button>

      {/* Portalled to the body so it sits under the bar (z-50) but over the page. On phones the
          menu already fills the screen, so the dim is desktop only. */}
      {createPortal(
        <div
          aria-hidden="true"
          className={`fixed inset-0 z-40 hidden bg-[var(--color-ink-veil)] transition-opacity duration-300 ease-out will-change-[opacity] md:block ${
            isOpen ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        />,
        document.body,
      )}

      {/* Always mounted inside a clipping wrapper so the panel can slide both ways. */}
      <div
        className={`absolute inset-x-0 top-full z-40 overflow-hidden ${
          isOpen ? "" : "pointer-events-none"
        }`}
        inert={!isOpen}
      >
        <div
          className={`h-[calc(100dvh-var(--nav-h,120px))] overflow-hidden rounded-b-[28px] bg-ink pb-4 transition-transform duration-300 ease-out will-change-transform md:h-auto md:overflow-visible md:pb-7 ${
            isOpen ? "translate-y-0" : "-translate-y-full"
          }`}
        >
          {/* A rule-coloured bed showing through 1px gaps: one crisp line everywhere, no doubling. */}
          <div className="mx-4 grid h-full grid-flow-col grid-cols-2 grid-rows-8 gap-px rounded-[28px] bg-rule p-px md:mx-7 [&>*:first-child]:rounded-tl-[27px] [&>*:last-child]:rounded-br-[27px] [&>*:nth-child(8)]:rounded-bl-[27px] [&>*:nth-child(9)]:rounded-tr-[27px] md:h-auto lg:grid-cols-4 lg:grid-rows-4 lg:[&>*:nth-child(13)]:rounded-tr-[27px] lg:[&>*:nth-child(4)]:rounded-bl-[27px] lg:[&>*:nth-child(8)]:rounded-none lg:[&>*:nth-child(9)]:rounded-none">
            {(allTags ?? []).map((tag, index) => {
              const isSelected = emotions.includes(tag)
              const isBlocked = !isSelected && emotions.length >= MAX_TRAITS
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleToggleTag(tag)}
                  disabled={isBlocked}
                  className={`group/cell relative flex items-center gap-[8px] bg-ink px-3 py-3 text-left font-semibold text-[clamp(14px,4.4vw,44px)] tracking-[-0.03em] transition-colors duration-200 md:px-5 md:py-5 lg:gap-[10px] lg:px-7 lg:py-6 lg:text-[clamp(26px,2.8vw,58px)] ${
                    isSelected ? "z-10" : ""
                  } ${isBlocked ? "text-paper/30" : "text-paper"}`}
                  aria-pressed={isSelected}
                >
                  {/* The pill: radius and colour animate in over the cell's own rules. */}
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none absolute -inset-px transform-gpu border transition-[border-radius,border-color] duration-150 ease-out ${
                      isSelected
                        ? "rounded-[64px] border-paper"
                        : `rounded-none border-transparent ${
                            isBlocked
                              ? ""
                              : "md:group-hover/cell:rounded-[28px] md:group-hover/cell:border-rule"
                          }`
                    }`}
                  />
                  <span className="shrink-0 font-light font-mono text-[13px] leading-none tracking-[0.01em] opacity-40 tabular-nums lg:text-[16px]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {tag}
                  {isSelected && (
                    <CrossMark
                      src={crossThinIcon}
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
