"use client"

import { useEffect, useRef } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { captureEvent } from "@/lib/analytics/posthog-events"

export function CabinCreatedTracker({
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
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const sent = useRef(false)

  useEffect(() => {
    if (sent.current) return
    if (searchParams.get("created") !== "1") return
    sent.current = true
    captureEvent("cabin_created", {
      cabin_id: cabinId,
      location,
      price_per_night: Math.round(pricePerNightOre / 100),
      has_transport: hasTransport,
    })
    const next = new URLSearchParams(searchParams.toString())
    next.delete("created")
    const q = next.toString()
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false })
  }, [cabinId, location, pricePerNightOre, hasTransport, pathname, router, searchParams])

  return null
}
