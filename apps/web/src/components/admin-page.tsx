import { useState } from "react"
import { setAdminKey, useIsAdmin } from "../lib/admin"
import { navigate } from "../lib/router"

// Not linked from anywhere. Visiting /admin once per device unlocks upload and editing there.
export function AdminPage() {
  const isAdmin = useIsAdmin()
  const [key, setKey] = useState("")
  const [status, setStatus] = useState<"idle" | "checking" | "wrong" | "offline">("idle")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const candidate = key.trim()
    if (!candidate) return
    setStatus("checking")
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/verify`, {
        method: "POST",
        headers: { "X-Admin-Key": candidate },
      })
      if (res.status === 204) {
        setAdminKey(candidate)
        setKey("")
        navigate("/")
        return
      }
      setStatus("wrong")
    } catch {
      setStatus("offline")
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      {isAdmin ? (
        <div className="flex flex-col items-center gap-6 text-center">
          <p>This device can upload and edit.</p>
          <button
            type="button"
            onClick={() => setAdminKey(null)}
            className="rounded-full border border-paper/30 px-[1em] py-[0.75em] transition-colors duration-150 hover:border-paper/60"
          >
            Lock this device
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
          <label htmlFor="admin-key" className="text-paper/60">
            Admin passphrase
          </label>
          <input
            id="admin-key"
            type="password"
            autoComplete="current-password"
            value={key}
            onChange={(e) => {
              setKey(e.target.value)
              setStatus("idle")
            }}
            className="rounded-full border border-paper/30 bg-transparent px-[1em] py-[0.75em] text-paper outline-none focus:border-paper/60"
          />
          <button
            type="submit"
            disabled={status === "checking" || !key.trim()}
            className="rounded-full border border-paper px-[1em] py-[0.75em] transition-colors duration-150 hover:border-paper/50 disabled:opacity-40"
          >
            {status === "checking" ? "Checking" : "Unlock"}
          </button>
          {status === "wrong" && <p className="text-paper/60">That passphrase didn't work.</p>}
          {status === "offline" && <p className="text-paper/60">Couldn't reach the API.</p>}
        </form>
      )}
    </div>
  )
}
