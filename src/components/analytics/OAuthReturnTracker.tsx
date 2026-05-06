"use client"

import { useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase"
import { captureEvent } from "@/lib/analytics/posthog-events"

const KEY = "sila_ph_pending_oauth"
export type PendingOAuth = "login_google" | "signup_google"

/** Call before redirecting to Google OAuth (login vs signup intent). */
export function setPendingOAuthIntent(intent: PendingOAuth) {
  if (typeof window === "undefined") return
  sessionStorage.setItem(KEY, intent)
}

export function clearPendingOAuthIntent() {
  if (typeof window === "undefined") return
  sessionStorage.removeItem(KEY)
}

/**
 * After OAuth redirect, fires login or signup_completed once when a session exists.
 * Must run client-side under PostHogProvider.
 */
export function OAuthReturnTracker() {
  const fired = useRef(false)

  useEffect(() => {
    if (fired.current) return
    const pending = sessionStorage.getItem(KEY) as PendingOAuth | null
    if (!pending || (pending !== "login_google" && pending !== "signup_google")) {
      return
    }

    const supabase = createClient()
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      fired.current = true
      sessionStorage.removeItem(KEY)
      if (pending === "login_google") {
        captureEvent("login", { method: "google" })
      } else {
        captureEvent("signup_completed", { method: "google" })
      }
    })
  }, [])

  return null
}
