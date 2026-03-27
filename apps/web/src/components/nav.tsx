import { navigate, usePathname } from "../lib/router"

export function Nav() {
  const pathname = usePathname()

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>, path: string) {
    e.preventDefault()
    navigate(path)
  }

  return (
    <nav className="flex items-center gap-6 border-b border-gray-200 px-6 py-4">
      <a href="/" onClick={(e) => handleClick(e, "/")} className="text-lg font-bold tracking-tight">
        sUIpe
      </a>
      <div className="flex gap-4 text-sm">
        <a
          href="/"
          onClick={(e) => handleClick(e, "/")}
          className={
            pathname === "/" ? "font-medium text-gray-900" : "text-gray-500 hover:text-gray-900"
          }
        >
          Browse
        </a>
        <a
          href="/upload"
          onClick={(e) => handleClick(e, "/upload")}
          className={
            pathname === "/upload"
              ? "font-medium text-gray-900"
              : "text-gray-500 hover:text-gray-900"
          }
        >
          Upload
        </a>
      </div>
    </nav>
  )
}
