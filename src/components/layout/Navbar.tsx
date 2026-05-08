"use client"

import { useState, useRef, useEffect } from "react"
import { useTranslations, useLocale } from "next-intl"
import { useRouter, usePathname, Link } from "@/i18n/navigation"
import {
  Globe, ChevronDown, Menu, X, LogIn,
  Plus, Home, Waves, Inbox,
} from "lucide-react"
import SilaLogoMark from "@/components/brand/SilaLogoMark"
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
import { updateLanguage } from "@/app/actions/language"
import { captureEvent } from "@/lib/analytics/posthog-events"
import { guestStayRequestHref } from "@/lib/cabinPublicPaths"

export type { NavUser } from "@/lib/getNavUser"

const LANG_LABEL: Record<"da" | "en" | "kl", string> = {
  da: "Dansk",
  en: "English",
  kl: "Kalaallisut",
}

function NavAvatarCircle({
  user,
  solid,
  avatarAltFallback,
  className = "w-8 h-8",
}: {
  user: NavUser
  solid: boolean
  avatarAltFallback: string
  className?: string
}) {
  const displayName = user.fullName ?? null
  const initial = displayName ? displayName[0].toUpperCase() : "?"
  return user.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={user.avatarUrl}
      alt={displayName ?? avatarAltFallback}
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
  const t = useTranslations("nav")
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const isHome = pathname === "/"

  /* ── Scroll state ── */
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    if (!isHome) { setScrolled(true); return }
    function onScroll() { setScrolled(window.scrollY > 40) }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [isHome])

  const solid = scrolled || !isHome

  /* ── Role type ── */
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

  /* ── Locale switching ── */
  async function handleLocaleSwitch(newLocale: "da" | "en") {
    if (newLocale === locale) return
    captureEvent("language_switched", { from: locale, to: newLocale })
    if (user) await updateLanguage(newLocale)
    router.replace(pathname, { locale: newLocale })
  }

  const displayName = user?.fullName ?? null

  const navBg    = solid ? "bg-white/95 backdrop-blur-md border-b border-border shadow-sm" : "bg-transparent"
  const textMain = solid ? "text-foreground"     : "text-white"
  const textMuted= solid ? "text-foreground/60"  : "text-white/80"
  const textNav  = solid ? "text-foreground/80 hover:text-foreground" : "text-white/90 hover:text-white"

  return (
    <>
      <nav className={`fixed top-0 w-full z-40 transition-all duration-200 ${navBg}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

          {/* ── Logo ── */}
          <Link href="/" className={`flex items-center gap-2 ${textMain}`}>
            <SilaLogoMark size={22} className="shrink-0 text-primary" />
            <span className="text-xl font-semibold">{t("logoText")}</span>
          </Link>

          {/* ── Nav links — desktop ── */}
          <div className={`hidden md:flex items-center gap-8 text-sm font-medium ${textNav}`}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={`inline-flex items-center gap-1 transition-colors ${textNav}`}
                >
                  {t("stay")}
                  <ChevronDown size={14} className="opacity-70" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 rounded-2xl p-1.5">
                <DropdownMenuItem asChild className="rounded-xl cursor-pointer data-highlighted:bg-gray-50 data-highlighted:text-gray-900 focus:bg-gray-50 focus:text-gray-900">
                  <Link href="/ophold/i-naturen">{t("stayNature")}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-xl cursor-pointer data-highlighted:bg-gray-50 data-highlighted:text-gray-900 focus:bg-gray-50 focus:text-gray-900">
                  <Link href="/ophold/i-byen">{t("stayCity")}</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Link href="/transport" className="transition-colors">{t("transport")}</Link>

            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors shadow-sm"
                    aria-label={t("createListing")}
                  >
                    <Plus size={18} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-56 rounded-2xl p-1.5">
                  {isProvider && (
                    <DropdownMenuItem asChild>
                      <Link href="/opret" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer">
                        <Plus size={15} className="text-primary" />
                        <span>{t("createListing")}</span>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {isProvider && isTraveler && <DropdownMenuSeparator />}
                  {isTraveler && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href={guestStayRequestHref} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer">
                          <Home size={15} className="text-muted-foreground" />
                          <span>{t("requestStay")}</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/transport/anmod" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer">
                          <Waves size={15} className="text-muted-foreground" />
                          <span>{t("requestTransport")}</span>
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
                          <span>{t("guestRequests")}</span>
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
              {t("currency")} <ChevronDown size={13} />
            </button>

            {/* ── Locale switcher ── */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1.5 transition-colors hover:text-foreground"
                >
                  <Globe size={14} />
                  {LANG_LABEL[(locale as "da" | "en" | "kl") ?? "da"]}
                  <ChevronDown size={11} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36 rounded-2xl p-1.5">
                <DropdownMenuItem
                  onClick={() => handleLocaleSwitch("da")}
                  className={`rounded-xl px-3 py-2.5 cursor-pointer ${locale === "da" ? "font-semibold text-primary" : ""}`}
                >
                  {t("localeRowDa")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleLocaleSwitch("en")}
                  className={`rounded-xl px-3 py-2.5 cursor-pointer ${locale === "en" ? "font-semibold text-primary" : ""}`}
                >
                  {t("localeRowEn")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className={`flex items-center gap-2 transition-colors ${solid ? "hover:text-foreground" : "hover:text-white"}`}
                >
                  <NavAvatarCircle user={user} solid={solid} avatarAltFallback={t("profileAvatarAlt")} />
                  <span className={`max-w-[120px] truncate text-sm ${solid ? "text-foreground" : "text-white/90"}`}>
                    {displayName}
                  </span>
                  <ChevronDown size={13} />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 py-1">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-xs text-gray-400">{t("loggedInAs")}</p>
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
                      {t("dashboard")}
                    </Link>
                    <Link
                      href="/profil"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      {t("profile")}
                    </Link>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition-colors border-t border-gray-100 text-destructive font-medium"
                    >
                      {t("signOut")}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setLoginOpen(true)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                  solid
                    ? "border border-border text-foreground hover:bg-muted"
                    : "border border-white/25 text-white hover:bg-white/10"
                }`}
              >
                <LogIn size={14} />
                {t("signIn")}
              </button>
            )}
          </div>

          {/* ── Hamburger — mobile ── */}
          <button
            className={`md:hidden p-1 ${textMain}`}
            onClick={() => setMobileOpen(true)}
            aria-label={t("ariaOpenMenu")}
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
              <SilaLogoMark size={22} className="shrink-0 text-primary" />
              <span className="text-xl font-semibold">{t("logoText")}</span>
            </Link>
            <button
              onClick={() => setMobileOpen(false)}
              className="text-white p-1"
              aria-label={t("ariaCloseMenu")}
            >
              <X size={22} />
            </button>
          </div>

          {user && (
            <div className="flex items-center justify-center gap-3 px-4 py-3 border-b border-white/10 shrink-0">
              <NavAvatarCircle user={user} solid={false} avatarAltFallback={t("profileAvatarAlt")} />
              {displayName ? (
                <span className="text-sm font-medium text-white/90 truncate max-w-[200px]">
                  {displayName}
                </span>
              ) : null}
            </div>
          )}

          {/* Nav links */}
          <div className="flex-1 flex flex-col items-center justify-center">
            <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1 w-full text-center">
              {t("stay")}
            </p>
            <Link href="/ophold/i-naturen" onClick={() => setMobileOpen(false)} className="w-full text-center py-3 text-lg font-medium text-white/90 hover:text-primary transition-colors">{t("stayNature")}</Link>
            <Link href="/ophold/i-byen" onClick={() => setMobileOpen(false)} className="w-full text-center py-3 text-lg font-medium text-white/90 hover:text-primary transition-colors">{t("stayCity")}</Link>
            <Link href="/transport" onClick={() => setMobileOpen(false)} className="w-full text-center py-4 text-xl font-medium text-white/90 hover:text-primary transition-colors border-t border-white/10 mt-2">{t("transport")}</Link>

            {user ? (
              <>
                <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="w-full text-center py-4 text-xl font-medium text-white/90 hover:text-primary transition-colors">{t("dashboard")}</Link>
                <Link href="/profil" onClick={() => setMobileOpen(false)} className="w-full text-center py-4 text-xl font-medium text-white/90 hover:text-primary transition-colors">{t("profile")}</Link>
                {isTraveler && (
                  <>
                    <Link href={guestStayRequestHref} onClick={() => setMobileOpen(false)} className="w-full text-center py-3 text-lg font-medium text-white/90 hover:text-primary transition-colors">{t("requestStay")}</Link>
                    <Link href="/transport/anmod" onClick={() => setMobileOpen(false)} className="w-full text-center py-3 text-lg font-medium text-white/90 hover:text-primary transition-colors">{t("requestTransport")}</Link>
                  </>
                )}
                <button onClick={handleSignOut} className="mt-6 px-8 py-3 rounded-full text-sm font-medium border border-white/20 text-white/60 hover:text-white hover:border-white/40 transition-colors">
                  {t("signOut")}
                </button>
              </>
            ) : (
              <button
                onClick={() => { setMobileOpen(false); setLoginOpen(true) }}
                className="mt-6 px-8 py-3 rounded-full text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {t("signIn")}
              </button>
            )}
          </div>

          {/* Sprog + valuta */}
          <div className="pb-12 flex items-center justify-center gap-8 text-sm text-white/50">
            <button className="flex items-center gap-1 hover:text-white/80 transition-colors">
              {t("currency")} <ChevronDown size={12} />
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleLocaleSwitch("da")}
                className={`flex items-center gap-1 hover:text-white/80 transition-colors ${locale === "da" ? "text-white font-semibold" : ""}`}
              >
                <Globe size={13} />
                DA
              </button>
              <span className="text-white/20">|</span>
              <button
                onClick={() => handleLocaleSwitch("en")}
                className={`flex items-center gap-1 hover:text-white/80 transition-colors ${locale === "en" ? "text-white font-semibold" : ""}`}
              >
                EN
              </button>
            </div>
          </div>
        </div>
      )}

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  )
}
