import { useCallback } from "react"
import { navigate, usePathname } from "../lib/router"
import { TraitMenu } from "./browse/trait-menu"

export function Nav() {
  const pathname = usePathname()

  // React 19 callback ref cleanup — the menu sizes itself against the bar's real height, which
  // changes between the one-row desktop layout and the two-row mobile one.
  const navRef = useCallback((el: HTMLElement | null) => {
    if (!el) return
    const publish = () => {
      document.documentElement.style.setProperty("--nav-h", `${el.offsetHeight}px`)
    }
    publish()
    const observer = new ResizeObserver(publish)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>, path: string) {
    e.preventDefault()
    navigate(path)
  }

  return (
    // relative: the trait menu drops out of the centre cell and spans the full page width.
    <nav
      ref={navRef}
      className="sticky top-0 z-50 relative grid grid-cols-2 items-center gap-y-5 px-4 pt-6 pb-7 font-semibold text-base bg-ink/90 tracking-[-0.04em] text-paper backdrop-blur-md md:grid-cols-[1fr_auto_1fr] md:gap-y-0 md:px-7 md:pt-8 md:pb-[41px]"
    >
      <a href="/" onClick={(e) => handleClick(e, "/")} className="justify-self-start">
        suipe
      </a>

      <div className="order-last col-span-2 justify-self-center md:order-none md:col-span-1">
        {pathname === "/upload" ? null : <TraitMenu />}
      </div>

      <div className="flex items-center gap-4 justify-self-end md:gap-[25px]">
        <a href="/upload" onClick={(e) => handleClick(e, "/upload")} className="hover:opacity-70">
          upload
        </a>
        <a href="/saves" onClick={(e) => handleClick(e, "/saves")} className="hover:opacity-70">
          saves
        </a>
      </div>
    </nav>
  )
}
