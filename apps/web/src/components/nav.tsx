import { Moon, Sun } from "lucide-react"
import { useCallback, useSyncExternalStore } from "react"
import { useIsMobile } from "../hooks/use-is-mobile"
import { useIsAdmin } from "../lib/admin"
import { navigate, usePathname } from "../lib/router"
import { getTheme, subscribeTheme, toggleTheme } from "../lib/theme"
import { PageTitle } from "./browse/page-title"
import { TraitMenu } from "./browse/trait-menu"

// Parked, not deleted: flip to true to bring the light/dark switch back. Kept as a flag rather
// than commented out so the markup below stays type-checked and cannot quietly rot.
const SHOW_THEME_TOGGLE = false

export function Nav() {
  const pathname = usePathname()
  const isAdmin = useIsAdmin()
  const theme = useSyncExternalStore(subscribeTheme, getTheme, () => "dark" as const)
  const isMobile = useIsMobile()

  // React 19 callback ref cleanup — the menu fills from the bar's bottom edge down. On phones the
  // bar sticks with its first row above the viewport, so that edge moves as the page scrolls.
  const navRef = useCallback((el: HTMLElement | null) => {
    if (!el) return
    const publish = () => {
      const root = document.documentElement
      root.style.setProperty("--nav-h", `${Math.max(0, el.getBoundingClientRect().bottom)}px`)

      // How far the bar rides up when stuck: enough to carry the first row off screen while
      // leaving the recipe row the same breathing room it has below it. Measured rather than
      // guessed, so it survives the row changing height.
      const row = el.querySelector<HTMLElement>("[data-recipe-row]")
      const gap = Number.parseFloat(getComputedStyle(el).paddingBottom)
      if (row) root.style.setProperty("--nav-stick", `${Math.max(0, row.offsetTop - gap)}px`)
    }
    publish()
    const observer = new ResizeObserver(publish)
    observer.observe(el)
    window.addEventListener("scroll", publish, { passive: true })
    return () => {
      observer.disconnect()
      window.removeEventListener("scroll", publish)
    }
  }, [])

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>, path: string) {
    e.preventDefault()
    navigate(path)
  }

  return (
    // relative: the trait menu drops out of the centre cell and spans the full page width.
    <nav
      ref={navRef}
      className="sticky top-[calc(var(--nav-stick,52px)*-1)] z-50 relative grid grid-cols-2 items-center gap-y-8 px-4 pt-3 pb-7 font-medium text-base bg-[var(--color-ink-veil)] tracking-[-0.02em] text-paper backdrop-blur-md data-[menu-open=true]:bg-ink data-[menu-open=true]:backdrop-blur-none md:top-0 md:grid-cols-[1fr_auto_1fr] md:gap-y-0 md:px-7 md:pt-8 md:pb-[41px]"
    >
      <a href="/" onClick={(e) => handleClick(e, "/")} className="justify-self-start">
        sUIpe
      </a>

      {/* Filtering only applies to browse; faves has nothing to filter. */}
      {(pathname === "/upload" && isAdmin) || pathname === "/admin" || pathname === "/faves" ? (
        <div data-recipe-row className="order-last col-span-2 md:order-none md:col-span-1" />
      ) : (
        <>
          {/* Phones only: the title leads and the chip sits under it. order-2 puts it between the
              first row and the chip, which keeps the chip as the thing that pins when the bar
              rides up. */}
          {isMobile && (
            <div className="order-2 col-span-2 mt-4 mb-6 justify-self-center px-6">
              <PageTitle />
            </div>
          )}
          <div
            data-recipe-row
            className="order-last col-span-2 justify-self-center md:order-none md:col-span-1"
          >
            <TraitMenu />
          </div>
        </>
      )}

      <div className="flex items-center gap-4 justify-self-end md:gap-[25px]">
        {isAdmin && (
          <a href="/upload" onClick={(e) => handleClick(e, "/upload")} className="hover:opacity-70">
            upload
          </a>
        )}
        <a href="/faves" onClick={(e) => handleClick(e, "/faves")} className="hover:opacity-70">
          faves
        </a>
        {SHOW_THEME_TOGGLE && (
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="flex size-[3.125em] shrink-0 cursor-pointer items-center justify-center rounded-full border border-paper/30 transition-colors duration-150 hover:border-paper/60"
          >
            {theme === "dark" ? (
              <Sun className="size-[1.25em]" strokeWidth={1} />
            ) : (
              <Moon className="size-[1.25em]" strokeWidth={1} />
            )}
          </button>
        )}
      </div>
    </nav>
  )
}
