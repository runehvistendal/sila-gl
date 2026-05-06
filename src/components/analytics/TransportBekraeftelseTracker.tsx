"use client"

import { useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { captureEvent, PH_STORE } from "@/lib/analytics/posthog-events"

export function TransportBekraeftelseTracker() {
  const searchParams = useSearchParams()
  const done = useRef(false)

  useEffect(() => {
    if (done.current) return
    if (!searchParams.get("session_id")) return
    done.current = true
    try {
      const raw = sessionStorage.getItem(PH_STORE.transportCheckout)
      sessionStorage.removeItem(PH_STORE.transportCheckout)
      if (!raw) return
      const p = JSON.parse(raw) as {
        ride_share_id: string
        seats: number
        total_price_ore: number
      }
      captureEvent("transport_booking_completed", {
        ride_share_id: p.ride_share_id,
        seats: p.seats,
        total_price: Math.round(p.total_price_ore / 100),
      })
    } catch {
      /* ignore */
    }
  }, [searchParams])

  return null
}
