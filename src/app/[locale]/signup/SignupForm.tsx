"use client"

import { useState } from "react"
import Link from "next/link"
import { Mail, Lock, User, Loader2, CheckCircle } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { captureEvent } from "@/lib/analytics/posthog-events"
import {
  clearPendingOAuthIntent,
  setPendingOAuthIntent,
} from "@/components/analytics/OAuthReturnTracker"

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

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="white" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

export default function SignupForm() {
  const supabase = createClient()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleOAuth(provider: "google" | "facebook") {
    setLoading(true)
    setError(null)
    if (provider === "google") setPendingOAuthIntent("signup_google")
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      clearPendingOAuthIntent()
      setError(error.message)
      setLoading(false)
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError("Adgangskoden skal være mindst 8 tegn")
      return
    }
    if (password !== confirmPassword) {
      setError("Adgangskoderne matcher ikke")
      return
    }

    setLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Hvis session allerede er oprettet (email-bekræftelse er slået fra i Supabase)
    if (data.session) {
      captureEvent("signup_completed", { method: "email" })
      window.location.href = "/"
      return
    }

    captureEvent("signup_completed", { method: "email" })
    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 text-center">
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: "#EBF5FB" }}>
          <CheckCircle size={28} style={{ color: "#4A9CC7" }} />
        </div>
        <h2
          className="text-xl font-semibold text-[#09192A] mb-2"
          style={{ fontFamily: "var(--font-lora)" }}
        >
          Tjek din email
        </h2>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          Vi har sendt en bekræftelseslink til <strong>{email}</strong>.
          Klik på linket for at aktivere din konto.
        </p>
        <Link
          href="/"
          className="inline-flex items-center px-6 py-2.5 rounded-full text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          style={{ backgroundColor: "#124788" }}
        >
          Tilbage til forsiden
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-gray-100">
        <Link
          href="/"
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors mb-3 block"
        >
          ← Tilbage
        </Link>
        <h1
          className="text-xl font-semibold text-[#09192A]"
          style={{ fontFamily: "var(--font-lora)" }}
        >
          Opret konto på Sila
        </h1>
        <p className="text-sm text-gray-400 mt-1">Grønland på lokale vilkår</p>
      </div>

      <div className="px-6 py-5 flex flex-col gap-3">
        {/* Google */}
        <button
          onClick={() => handleOAuth("google")}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-3 md:py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 disabled:opacity-50"
        >
          <GoogleIcon />
          Fortsæt med Google
        </button>

        {/* TODO: Genaktivér når Facebook app er live-godkendt */}
        {/* <button
          onClick={() => handleOAuth("facebook")}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-3 md:py-2.5 rounded-xl text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          style={{ backgroundColor: "#1877F2" }}
        >
          <FacebookIcon />
          Fortsæt med Facebook
        </button> */}

        {/* Divider */}
        <div className="flex items-center gap-3 my-1">
          <hr className="flex-1 border-gray-200" />
          <span className="text-xs text-gray-400">eller</span>
          <hr className="flex-1 border-gray-200" />
        </div>

        {/* Fejlbesked */}
        {error && (
          <p
            className="text-sm text-center rounded-xl px-4 py-2.5 bg-red-50"
            style={{ color: "#BF3B2B" }}
          >
            {error}
          </p>
        )}

        {/* Formular */}
        <form onSubmit={handleSignup} className="flex flex-col gap-3">
          {/* Navn */}
          <div className="relative">
            <User
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Fulde navn"
              required
              className="w-full pl-10 pr-4 py-3 md:py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-[#4A9CC7] focus:ring-2 focus:ring-[#4A9CC7]/20 transition-colors"
            />
          </div>

          {/* Email */}
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
              className="w-full pl-10 pr-4 py-3 md:py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-[#4A9CC7] focus:ring-2 focus:ring-[#4A9CC7]/20 transition-colors"
            />
          </div>

          {/* Adgangskode */}
          <div className="relative">
            <Lock
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Adgangskode (min. 8 tegn)"
              required
              minLength={8}
              className="w-full pl-10 pr-4 py-3 md:py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-[#4A9CC7] focus:ring-2 focus:ring-[#4A9CC7]/20 transition-colors"
            />
          </div>

          {/* Bekræft adgangskode */}
          <div className="relative">
            <Lock
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Bekræft adgangskode"
              required
              className="w-full pl-10 pr-4 py-3 md:py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-[#4A9CC7] focus:ring-2 focus:ring-[#4A9CC7]/20 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 md:py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
            style={{ backgroundColor: "#124788" }}
          >
            {loading && <Loader2 size={15} className="animate-spin" />}
            Opret konto
          </button>
        </form>

        {/* Log ind link */}
        <p className="text-center text-sm text-gray-500 mt-1 pb-1">
          Har du allerede en konto?{" "}
          <Link
            href="/"
            className="font-medium hover:underline"
            style={{ color: "#4A9CC7" }}
          >
            Log ind
          </Link>
        </p>
      </div>
    </div>
  )
}
