import { AdminPage } from "./components/admin-page"
import { BrowsePage } from "./components/browse/browse-page"
import { FavesPage } from "./components/browse/faves-page"
import { Nav } from "./components/nav"
import { UploadPage } from "./components/upload/upload-page"
import { useIsAdmin } from "./lib/admin"
import { usePathname } from "./lib/router"

export function App() {
  const pathname = usePathname()
  const isAdmin = useIsAdmin()

  return (
    <div className="min-h-screen bg-ink font-light text-paper">
      <Nav />
      {pathname === "/faves" ? (
        <FavesPage />
      ) : pathname === "/admin" ? (
        <AdminPage />
      ) : pathname === "/upload" && isAdmin ? (
        // The redesign only covers browse, so upload keeps its light styling on a light surface.
        // --nav-h is the bar's live bottom edge, so the panel takes the rest of the window rather
        // than sitting wide and short with dead space under it.
        <div className="mx-4 mb-4 flex min-h-[calc(100dvh-var(--nav-h,120px)-16px)] rounded-2xl bg-white text-gray-900 md:mx-7 md:mb-7 md:min-h-[calc(100dvh-var(--nav-h,120px)-28px)]">
          <UploadPage />
        </div>
      ) : (
        <BrowsePage />
      )}
    </div>
  )
}
