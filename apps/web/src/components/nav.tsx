import { navigate, usePathname } from "../lib/router"

export function Nav() {
  const pathname = usePathname()

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>, path: string) {
    e.preventDefault()
    navigate(path)
  }

  return (
    <nav className="relative flex items-center border-b border-gray-200 px-6 py-4">
      {/* Browse — left */}
      <a
        href="/"
        onClick={(e) => handleClick(e, "/")}
        className={`text-sm ${pathname === "/" ? "font-medium text-gray-900" : "text-gray-500 hover:text-gray-900"}`}
      >
        Browse
      </a>

      {/* Logo — absolutely centered */}
      <a
        href="/"
        onClick={(e) => handleClick(e, "/")}
        className="absolute left-1/2 -translate-x-1/2 text-lg font-bold tracking-tight"
      >
        sUIpe
      </a>

      {/* Upload — right */}
      <a
        href="/upload"
        onClick={(e) => handleClick(e, "/upload")}
        className={`ml-auto text-sm ${
          pathname === "/upload" ? "font-medium text-gray-900" : "text-gray-500 hover:text-gray-900"
        }`}
      >
        Upload
      </a>
    </nav>
  )
}
