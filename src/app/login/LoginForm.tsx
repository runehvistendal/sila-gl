"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Mail, Lock, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase"

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get("next") ?? "/dashboard"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  async function handleOAuth(provider: "google") {
    setLoading(true)
    setError(null)
    const origin = window.location.origin
    const { error: oErr } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })
    if (oErr) {
      setError(oErr.message)
      setLoading(false)
    }
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error: signErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signErr) {
      setError(
        signErr.message === "Invalid login credentials"
          ? "Forkert email eller adgangskode"
          : signErr.message,
      )
      setLoading(false)
      return
    }

    router.push(next)
    router.refresh()
  }

  return (
    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
      <div className="px-6 pt-8 pb-4 border-b border-gray-100">
        <h2 className="text-xl font-semibold text-[#09192A]">Log ind på Sila</h2>
      </div>

      <div className="px-6 py-5 flex flex-col gap-3">
        <button
          type="button"
          onClick={() => handleOAuth("google")}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-3 md:py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 disabled:opacity-50"
        >
          <GoogleIcon />
          Fortsæt med Google
        </button>

        <div className="flex items-center gap-3 my-1">
          <hr className="flex-1 border-gray-200" />
          <span className="text-xs text-gray-400">eller</span>
          <hr className="flex-1 border-gray-200" />
        </div>

        {error && (
          <p
            className="text-sm text-center rounded-xl px-4 py-2.5 bg-red-50"
            style={{ color: "#BF3B2B" }}
          >
            {error}
          </p>
        )}

        <form onSubmit={handleEmailLogin} className="flex flex-col gap-3">
          <div className="relative">
            <Mail
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              autoComplete="email"
              className="w-full pl-10 pr-4 py-3 md:py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-[#4A9CC7] focus:ring-2 focus:ring-[#4A9CC7]/20 transition-colors"
            />
          </div>

          <div className="relative">
            <Lock
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Adgangskode"
              required
              autoComplete="current-password"
              className="w-full pl-10 pr-4 py-3 md:py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-[#4A9CC7] focus:ring-2 focus:ring-[#4A9CC7]/20 transition-colors"
            />
          </div>

          <div className="flex justify-end -mt-1">
            <Link
              href="/reset-password"
              className="text-xs hover:underline"
              style={{ color: "#4A9CC7" }}
            >
              Glemt adgangskode?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 md:py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
            style={{ backgroundColor: "#124788" }}
          >
            {loading && <Loader2 size={15} className="animate-spin" />}
            Log ind
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-1 pb-1">
          Har du ikke en konto?{" "}
          <Link
            href="/signup"
            className="font-medium hover:underline"
            style={{ color: "#4A9CC7" }}
          >
            Opret konto
          </Link>
        </p>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}
