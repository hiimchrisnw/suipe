import { BrowsePage } from "./components/browse/browse-page"
import { Nav } from "./components/nav"
import { UploadPage } from "./components/upload/upload-page"
import { usePathname } from "./lib/router"

export function App() {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-white font-light text-gray-900">
      <Nav />
      {pathname === "/upload" ? <UploadPage /> : <BrowsePage />}
    </div>
  )
}
