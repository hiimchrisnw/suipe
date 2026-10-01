import { BrowsePage } from "./components/browse/browse-page"
import { Nav } from "./components/nav"
import { UploadPage } from "./components/upload/upload-page"
import { usePathname } from "./lib/router"

export function App() {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-ink font-light text-paper">
      <Nav />
      {pathname === "/upload" ? (
        // The redesign only covers browse, so upload keeps its light styling on a light surface.
        <div className="mx-4 mb-4 rounded-2xl bg-paper text-gray-900 md:mx-7 md:mb-7">
          <UploadPage />
        </div>
      ) : (
        <BrowsePage />
      )}
    </div>
  )
}
