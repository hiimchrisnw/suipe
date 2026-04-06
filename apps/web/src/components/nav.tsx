import { navigate, usePathname } from "../lib/router"

export function Nav() {
  const pathname = usePathname()

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>, path: string) {
    e.preventDefault()
    navigate(path)
  }

  return (
    <nav className="relative flex items-center border-b border-gray-200 px-4 py-3 md:px-6 md:py-4">
      {/* Browse — left */}
      <a
        href="/"
        onClick={(e) => handleClick(e, "/")}
        className={`text-base ${pathname === "/" ? "font-normal text-gray-900" : "font-normal text-gray-500 hover:text-gray-900"}`}
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
        className={`ml-auto text-base ${
          pathname === "/upload"
            ? "font-normal text-gray-900"
            : "font-normal text-gray-500 hover:text-gray-900"
        }`}
      >
        Upload
      </a>
    </nav>
  )
}
