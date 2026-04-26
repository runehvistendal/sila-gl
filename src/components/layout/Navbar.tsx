"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Globe, ChevronDown, Menu, X, Anchor, LogIn } from "lucide-react"
import { createClient } from "@/lib/supabase"
import LoginModal from "@/components/auth/LoginModal"

export type NavUser = {
  id: string
  email?: string | null
  name?: string | null
}

export default function Navbar({ user }: { user?: NavUser | null }) {
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUserMenuOpen(false)
    setMobileOpen(false)
    router.refresh()
  }

  const displayName = user?.name ?? user?.email ?? null
  const initial = displayName ? displayName[0].toUpperCase() : "?"

  return (
    <>
      <nav className="fixed top-0 w-full z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 text-white">
            <Anchor size={20} className="text-primary" />
            <span className="text-xl font-semibold">Sila</span>
          </Link>

          {/* Nav links — desktop */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-white/90">
            <Link href="/hytter"     className="hover:text-white transition-colors">Hytter</Link>
            <Link href="/samsejlads" className="hover:text-white transition-colors">Samsejlads</Link>
            <Link href="/transport"  className="hover:text-white transition-colors">Transport</Link>
            {user && (
              <Link href="/opret" className="hover:text-white transition-colors">Opret opslag</Link>
            )}
          </div>

          {/* Højre side — desktop */}
          <div className="hidden md:flex items-center gap-4 text-sm text-white/80">
            <button className="flex items-center gap-1 hover:text-white transition-colors">
              DKK (kr) <ChevronDown size={13} />
            </button>
            <button className="flex items-center gap-1.5 hover:text-white transition-colors">
              <Globe size={14} /> Dansk
            </button>

            {user ? (
              /* Bruger-dropdown */
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 hover:text-white transition-colors"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{
                      backgroundColor: "rgba(74,156,199,0.2)",
                      border: "1px solid rgba(74,156,199,0.4)",
                      color: "#4A9CC7",
                    }}
                  >
                    {initial}
                  </div>
                  <span className="max-w-[120px] truncate text-white/90 text-sm">
                    {displayName}
                  </span>
                  <ChevronDown size={13} />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 py-1">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-xs text-gray-400">Logget ind som</p>
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {user.email}
                      </p>
                    </div>
                    <Link
                      href="/mine-hytter"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Mine hytter
                    </Link>
                    <Link
                      href="/opret"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Opret opslag
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition-colors border-t border-gray-100"
                      style={{ color: "#BF3B2B" }}
                    >
                      Log ud
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Log ind-knap */
              <button
                onClick={() => setLoginOpen(true)}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold border border-white/25 hover:bg-white/10 transition-colors text-white"
              >
                <LogIn size={14} />
                Log ind
              </button>
            )}
          </div>

          {/* Hamburger — mobile */}
          <button
            className="md:hidden text-white p-1"
            onClick={() => setMobileOpen(true)}
            aria-label="Åbn menu"
          >
            <Menu size={22} />
          </button>
        </div>
      </nav>

      {/* Fullscreen mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col md:hidden"
          style={{
            backgroundColor: "rgba(9,25,42,0.98)",
            backdropFilter: "blur(16px)",
          }}
        >
          {/* Top bar */}
          <div className="h-16 flex items-center justify-between px-4 sm:px-6 shrink-0">
            <Link
              href="/"
              className="flex items-center gap-2 text-white"
              onClick={() => setMobileOpen(false)}
            >
              <Anchor size={20} className="text-primary" />
              <span className="text-xl font-semibold">Sila</span>
            </Link>
            <button
              onClick={() => setMobileOpen(false)}
              className="text-white p-1"
              aria-label="Luk menu"
            >
              <X size={22} />
            </button>
          </div>

          {/* Nav links — centrerede med touch-venlige targets */}
          <div className="flex-1 flex flex-col items-center justify-center">
            <Link
              href="/hytter"
              onClick={() => setMobileOpen(false)}
              className="w-full text-center py-4 text-xl font-medium text-white/90 hover:text-[#4A9CC7] transition-colors"
            >
              Hytter
            </Link>
            <Link
              href="/samsejlads"
              onClick={() => setMobileOpen(false)}
              className="w-full text-center py-4 text-xl font-medium text-white/90 hover:text-[#4A9CC7] transition-colors"
            >
              Samsejlads
            </Link>
            <Link
              href="/transport"
              onClick={() => setMobileOpen(false)}
              className="w-full text-center py-4 text-xl font-medium text-white/90 hover:text-[#4A9CC7] transition-colors"
            >
              Transport
            </Link>

            {user ? (
              <>
                <Link
                  href="/mine-hytter"
                  onClick={() => setMobileOpen(false)}
                  className="w-full text-center py-4 text-xl font-medium text-white/90 hover:text-[#4A9CC7] transition-colors"
                >
                  Mine hytter
                </Link>
                <Link
                  href="/opret"
                  onClick={() => setMobileOpen(false)}
                  className="w-full text-center py-4 text-xl font-medium text-white/90 hover:text-[#4A9CC7] transition-colors"
                >
                  Opret opslag
                </Link>
                <button
                  onClick={handleSignOut}
                  className="mt-6 px-8 py-3 rounded-full text-sm font-medium border border-white/20 text-white/60 hover:text-white hover:border-white/40 transition-colors"
                >
                  Log ud
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  setMobileOpen(false)
                  setLoginOpen(true)
                }}
                className="mt-6 px-8 py-3 rounded-full text-sm font-semibold text-[#09192A] bg-[#4A9CC7] hover:opacity-90 transition-opacity"
              >
                Log ind
              </button>
            )}
          </div>

          {/* Sprog + valuta */}
          <div className="pb-12 flex items-center justify-center gap-8 text-sm text-white/50">
            <button className="flex items-center gap-1 hover:text-white/80 transition-colors">
              DKK (kr) <ChevronDown size={12} />
            </button>
            <button className="flex items-center gap-1.5 hover:text-white/80 transition-colors">
              <Globe size={13} /> Dansk
            </button>
          </div>
        </div>
      )}

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  )
}
