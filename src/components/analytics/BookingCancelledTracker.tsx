"use client"

import { useEffect, useRef } from "react"
import { captureEvent, PH_STORE } from "@/lib/analytics/posthog-events"

export function BookingCancelledTracker({ cabinId }: { cabinId?: string }) {
  const sent = useRef(false)

  useEffect(() => {
    if (sent.current) return
    sent.current = true
    captureEvent("booking_cancelled", {
      cabin_id: cabinId ?? "",
      reason: "user" as const,
    })
    try {
      sessionStorage.removeItem(PH_STORE.cabinCheckout)
    } catch {
      /* ignore */
    }
  }, [cabinId])

  return null
}
