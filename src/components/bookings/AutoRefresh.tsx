"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "@/i18n/navigation"

/**
 * Genindlæser server-data med faste mellemrum, fx mens vi venter på at
 * Stripe-webhooken bekræfter en betaling. Stopper efter `maxTries`.
 */
export default function AutoRefresh({ intervalMs = 3000, maxTries = 10 }: { intervalMs?: number; maxTries?: number }) {
  const router = useRouter()
  const tries = useRef(0)

  useEffect(() => {
    const id = window.setInterval(() => {
      tries.current += 1
      if (tries.current > maxTries) {
        window.clearInterval(id)
        return
      }
      router.refresh()
    }, intervalMs)
    return () => window.clearInterval(id)
  }, [router, intervalMs, maxTries])

  return null
}
