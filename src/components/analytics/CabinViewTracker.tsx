"use client"

import { useEffect, useRef } from "react"
import { captureEvent } from "@/lib/analytics/posthog-events"

export function CabinViewTracker({
  cabinId,
  location,
  pricePerNightOre,
  hasTransport,
}: {
  cabinId: string
  location: string
  pricePerNightOre: number
  hasTransport: boolean
}) {
  const sent = useRef(false)
  useEffect(() => {
    if (sent.current) return
    sent.current = true
    captureEvent("cabin_viewed", {
      cabin_id: cabinId,
      location,
      price_per_night: Math.round(pricePerNightOre / 100),
      has_transport: hasTransport,
    })
  }, [cabinId, location, pricePerNightOre, hasTransport])
  return null
}
