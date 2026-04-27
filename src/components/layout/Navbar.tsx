"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import {
  Globe, ChevronDown, Menu, X, Anchor, LogIn,
  Plus, Home, Waves, Inbox,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { createClient } from "@/lib/supabase"
import LoginModal from "@/components/auth/LoginModal"
import type { NavUser } from "@/lib/getNavUser"

export type { NavUser } from "@/lib/getNavUser"

function NavAvatarCircle({
  user,
  solid,
  className = "w-8 h-8",
}: {
  user: NavUser
  solid: boolean
  className?: string
}) {
  const displayName = user.fullName ?? null
  const initial = displayName ? displayName[0].toUpperCase() : "?"
  return user.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={user.avatarUrl}
      alt={displayName ?? "Profil"}
      className={`${className} rounded-full object-cover shrink-0`}
      style={{ border: "1px solid rgba(74,156,199,0.4)" }}
    />
  ) : (
    <div
      className={`${className} rounded-full flex items-center justify-center text-xs font-bold shrink-0`}
      style={{
        backgroundColor: solid
          ? "rgba(74,156,199,0.15)"
          : "rgba(74,156,199,0.25)",
        border: "1px solid rgba(74,156,199,0.4)",
        color: "#4A9CC7",
      }}
    >
      {initial}
    </div>
  )
}

export default function Navbar({ user }: { user?: NavUser | null }) {
  const router   = useRouter()
  const pathname = usePathname()
  const isHome   = pathname === "/"

  /* ── Scroll state ── */
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    // Non-home pages are always "scrolled" (solid bg)
    if (!isHome) { setScrolled(true); return }

    function onScroll() { setScrolled(window.scrollY > 40) }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [isHome])

  const solid = scrolled || !isHome

  /* ── Role type (fetch once on mount when logged in) ── */
  const [roleType, setRoleType] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    const supabase = createClient()
    supabase
      .from("profiles")
      .select("role_type")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        setRoleType((data?.role_type as string | undefined) ?? "traveler")
      })
  }, [user])

  const effectiveRole = roleType ?? "traveler"
  const isProvider = effectiveRole === "provider" || effectiveRole === "both"
  const isTraveler = effectiveRole === "traveler" || effectiveRole === "both"

  /* ── UI state ── */
  const [mobileOpen,  setMobileOpen]  = useState(false)
  const [loginOpen,   setLoginOpen]   = useState(false)
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

  const displayName = user?.fullName ?? null

  /* Dynamic classes that depend on solid/transparent */
  const navBg    = solid ? "bg-white/95 backdrop-blur-md border-b border-border shadow-sm" : "bg-transparent"
  const textMain = solid ? "text-foreground"     : "text-white"
  const textMuted= solid ? "text-foreground/60"  : "text-white/80"
  const textNav  = solid ? "text-foreground/80 hover:text-foreground" : "text-white/90 hover:text-white"

  return (
    <>
      <nav className={`fixed top-0 w-full z-50 transition-all duration-200 ${navBg}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

          {/* ── Logo ── */}
          <Link href="/" className={`flex items-center gap-2 ${textMain}`}>
            <Anchor size={20} className="text-primary" />
            <span className="text-xl font-semibold">Sila</span>
          </Link>

          {/* ── Nav links — desktop ── */}
          <div className={`hidden md:flex items-center gap-8 text-sm font-medium ${textNav}`}>
            <Link href="/hytter"    className="transition-colors">Hytter</Link>
            <Link href="/transport" className="transition-colors">Transport</Link>

            {/* ── Plus button (logged in only) ── */}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors shadow-sm"
                    aria-label="Opret eller anmod"
                  >
                    <Plus size={18} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-56 rounded-2xl p-1.5">
                  {isProvider && (
                    <DropdownMenuItem asChild>
                      <Link href="/opret" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer">
                        <Plus size={15} className="text-primary" />
                        <span>Opret opslag</span>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {isProvider && isTraveler && <DropdownMenuSeparator />}
                  {isTraveler && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/anmod?type=cabin" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer">
                          <Home size={15} className="text-muted-foreground" />
                          <span>Anmod om hytte</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/anmod?type=transport" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer">
                          <Waves size={15} className="text-muted-foreground" />
                          <span>Anmod om transport</span>
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  {isProvider && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/dashboard?tab=open-requests" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer">
                          <Inbox size={15} className="text-muted-foreground" />
                          <span>Gæsteønsker</span>
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* ── Right side — desktop ── */}
          <div className={`hidden md:flex items-center gap-4 text-sm ${textMuted}`}>
            <button className="flex items-center gap-1 transition-colors hover:text-foreground">
              DKK (kr) <ChevronDown size={13} />
            </button>
            <button className="flex items-center gap-1.5 transition-colors hover:text-foreground">
              <Globe size={14} /> Dansk
            </button>

            {user ? (
              /* ── User dropdown ── */
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className={`flex items-center gap-2 transition-colors ${solid ? "hover:text-foreground" : "hover:text-white"}`}
                >
                  <NavAvatarCircle user={user} solid={solid} />
                  <span className={`max-w-[120px] truncate text-sm ${solid ? "text-foreground" : "text-white/90"}`}>
                    {displayName}
                  </span>
                  <ChevronDown size={13} />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 py-1">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-xs text-gray-400">Logget ind som</p>
                      {user.fullName ? (
                        <p className="text-sm font-semibold text-gray-800 truncate">
                          {user.fullName}
                        </p>
                      ) : null}
                    </div>
                    <Link
                      href="/dashboard"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/profil"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Profil
                    </Link>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition-colors border-t border-gray-100 text-destructive font-medium"
                    >
                      Log ud
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* ── Log ind-knap ── */
              <button
                onClick={() => setLoginOpen(true)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                  solid
                    ? "border border-border text-foreground hover:bg-muted"
                    : "border border-white/25 text-white hover:bg-white/10"
                }`}
              >
                <LogIn size={14} />
                Log ind
              </button>
            )}
          </div>

          {/* ── Hamburger — mobile ── */}
          <button
            className={`md:hidden p-1 ${textMain}`}
            onClick={() => setMobileOpen(true)}
            aria-label="Åbn menu"
          >
            <Menu size={22} />
          </button>
        </div>
      </nav>

      {/* ── Fullscreen mobile overlay ── */}
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

          {user && (
            <div className="flex items-center justify-center gap-3 px-4 py-3 border-b border-white/10 shrink-0">
              <NavAvatarCircle user={user} solid={false} />
              {displayName ? (
                <span className="text-sm font-medium text-white/90 truncate max-w-[200px]">
                  {displayName}
                </span>
              ) : null}
            </div>
          )}

          {/* Nav links */}
          <div className="flex-1 flex flex-col items-center justify-center">
            <Link href="/hytter"    onClick={() => setMobileOpen(false)} className="w-full text-center py-4 text-xl font-medium text-white/90 hover:text-primary transition-colors">Hytter</Link>
            <Link href="/transport" onClick={() => setMobileOpen(false)} className="w-full text-center py-4 text-xl font-medium text-white/90 hover:text-primary transition-colors">Transport</Link>

            {user ? (
              <>
                <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="w-full text-center py-4 text-xl font-medium text-white/90 hover:text-primary transition-colors">Dashboard</Link>
                <Link href="/profil" onClick={() => setMobileOpen(false)} className="w-full text-center py-4 text-xl font-medium text-white/90 hover:text-primary transition-colors">Profil</Link>
                {isTraveler && (
                  <Link href="/anmod?type=cabin" onClick={() => setMobileOpen(false)} className="w-full text-center py-4 text-xl font-medium text-white/90 hover:text-primary transition-colors">Anmod om hytte</Link>
                )}
                <button onClick={handleSignOut} className="mt-6 px-8 py-3 rounded-full text-sm font-medium border border-white/20 text-white/60 hover:text-white hover:border-white/40 transition-colors">
                  Log ud
                </button>
              </>
            ) : (
              <button
                onClick={() => { setMobileOpen(false); setLoginOpen(true) }}
                className="mt-6 px-8 py-3 rounded-full text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
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
