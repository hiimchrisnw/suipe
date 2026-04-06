import { Moon, Sun } from "lucide-react"
import { useState } from "react"
import { navigate, usePathname } from "../lib/router"

type Theme = "dark" | "light"

function getStoredTheme(): Theme {
  const stored = localStorage.getItem("theme")
  return stored === "light" ? "light" : "dark"
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.remove("dark", "light")
  document.documentElement.classList.add(theme)
  localStorage.setItem("theme", theme)
}

// Apply stored theme on module load (before first render)
applyTheme(getStoredTheme())

export function Nav() {
  const pathname = usePathname()
  const [theme, setTheme] = useState<Theme>(getStoredTheme)

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>, path: string) {
    e.preventDefault()
    navigate(path)
  }

  function toggleTheme() {
    const next: Theme = theme === "dark" ? "light" : "dark"
    setTheme(next)
    applyTheme(next)
  }

  return (
    <nav className="relative flex items-center border-b border-gray-200 px-6 py-4">
      {/* Upload — left */}
      <a
        href="/upload"
        onClick={(e) => handleClick(e, "/upload")}
        className={`text-sm ${
          pathname === "/upload" ? "font-medium text-gray-900" : "text-gray-500 hover:text-gray-900"
        }`}
      >
        Upload
      </a>

      {/* Logo — absolutely centered */}
      <a
        href="/"
        onClick={(e) => handleClick(e, "/")}
        className="absolute left-1/2 -translate-x-1/2 text-lg font-bold tracking-tight"
      >
        sUIpe
      </a>

      {/* Theme toggle — right */}
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        className="ml-auto text-gray-500 hover:text-gray-900"
      >
        {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </nav>
  )
}
