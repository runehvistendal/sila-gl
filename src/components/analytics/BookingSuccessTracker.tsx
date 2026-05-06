"use client"

import { useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { captureEvent, PH_STORE } from "@/lib/analytics/posthog-events"

type PendingCabin = {
  cabin_id: string
  location: string
  nights: number
  total_price_ore: number
  instant_book?: boolean
}

export function BookingSuccessTracker() {
  const searchParams = useSearchParams()
  const done = useRef(false)

  useEffect(() => {
    if (done.current) return
    if (!searchParams.get("session_id")) return
    done.current = true

    try {
      const raw = sessionStorage.getItem(PH_STORE.cabinCheckout)
      if (!raw) return
      const p = JSON.parse(raw) as PendingCabin
      sessionStorage.removeItem(PH_STORE.cabinCheckout)
      captureEvent("booking_completed", {
        cabin_id: p.cabin_id,
        location: p.location,
        nights: p.nights,
        total_price: Math.round(p.total_price_ore / 100),
      })
      if (p.instant_book) {
        captureEvent("instant_book_used", { cabin_id: p.cabin_id })
      }
    } catch {
      /* ignore */
    }
  }, [searchParams])

  return null
}
