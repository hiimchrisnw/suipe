import { AdminPage } from "./components/admin-page"
import { BrowsePage } from "./components/browse/browse-page"
import { FavesPage } from "./components/browse/faves-page"
import { SwipeDetailRoute } from "./components/browse/swipe-detail-page"
import { Nav } from "./components/nav"
import { UploadPage } from "./components/upload/upload-page"
import { useIsAdmin } from "./lib/admin"
import { setSearchParam, usePathname, useSearchParam } from "./lib/router"

export function App() {
  const pathname = usePathname()
  const isAdmin = useIsAdmin()
  // A swipe link opens the detail view wherever it is followed from, grid or faves.
  const openSwipeId = useSearchParam("swipe")

  return (
    <div className="flex min-h-screen flex-col bg-ink font-light text-paper">
      {/* The detail view is its own screen: no bar, so the swipe takes the whole window. */}
      {!openSwipeId && <Nav />}
      {openSwipeId ? (
        <SwipeDetailRoute id={openSwipeId} onClose={() => setSearchParam("swipe", null)} />
      ) : pathname === "/faves" ? (
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
