"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { checkOnboardingStatus } from "@/app/actions/stripe"
import { Loader2 } from "lucide-react"
import { captureEvent } from "@/lib/analytics/posthog-events"

export default function StripeReturnPage() {
  const router = useRouter()
  const [label, setLabel] = useState("Kontrollerer Stripe…")

  useEffect(() => {
    let cancelled = false
    checkOnboardingStatus()
      .then((r) => {
        if (cancelled) return
        if ("error" in r) {
          setLabel(r.error)
          router.replace("/profil?stripe=error")
          return
        }
        if (r.complete) {
          captureEvent("stripe_onboarding_completed", {})
        }
        router.replace("/profil" + (r.complete ? "?stripe=ok" : ""))
      })
      .catch(() => {
        if (!cancelled) router.replace("/profil?stripe=error")
      })
    return () => {
      cancelled = true
    }
  }, [router])

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-4 bg-gray-50"
      style={{ fontFamily: "var(--font-jakarta, system-ui)" }}
    >
      <Loader2
        className="w-8 h-8 animate-spin text-[#4A9CC7] mb-4"
        aria-hidden
      />
      <p className="text-sm text-gray-600 text-center">{label}</p>
    </main>
  )
}
