import { MAX_TRAITS } from "@suipe/schemas"
import { useCallback, useEffect, useState } from "react"
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

export function TraitMenu() {
  const emotions = useSelectedTraits()
  const [isOpen, setIsOpen] = useState(false)
  const { data: allTags } = useTags()

  // React 19 callback ref cleanup — click-outside and Escape close the menu.
  const containerRef = useCallback((el: HTMLDivElement | null) => {
    if (!el) return
    const onMouseDown = (e: MouseEvent) => {
      if (!el.contains(e.target as Node)) setIsOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false)
    }
    document.addEventListener("mousedown", onMouseDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("mousedown", onMouseDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, []) // setIsOpen from useState is stable

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
    <div ref={containerRef} className="flex items-center">
      {emotions.map((emotion) => (
        <button
          key={emotion}
          type="button"
          onClick={() => handleRemoveTag(emotion)}
          // -mr-px: neighbouring pills share one rule rather than sitting apart.
          className="-mr-px flex shrink-0 items-center justify-center gap-[7px] rounded-full border border-paper px-[14px] py-[3.5px] text-paper hover:opacity-70"
          aria-label={`Remove ${emotion}`}
        >
          {emotion}
          <img src={crossIcon} alt="" className="h-[11.7px] w-[11.9px] opacity-30" />
        </button>
      ))}

      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        // At the cap there is nothing left to add, but the menu must still be closable.
        disabled={emotions.length >= MAX_TRAITS && !isOpen}
        className={`flex shrink-0 items-center justify-center gap-[7px] rounded-full border text-paper hover:opacity-70 disabled:opacity-30 disabled:hover:opacity-30 ${
          emotions.length > 0
            ? "border-paper size-[33px]"
            : "border-paper/30 border-dashed px-[14px] py-[3.5px]"
        }`}
        aria-expanded={isOpen}
      >
        {emotions.length === 0 && <span>Add a trait</span>}
        {/* The asset is a cross; rotating it reads as a plus until the menu is open. */}
        <img
          src={crossIcon}
          alt=""
          className={`transition-transform duration-300 ${"h-[11.7px] w-[11.9px]"} ${isOpen ? "" : "-rotate-45"}`}
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
          className={`h-[calc(100dvh-var(--nav-h,120px))] overflow-y-auto bg-ink pb-4 transition-transform duration-300 ease-out md:h-auto md:overflow-visible md:pb-7 ${
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
