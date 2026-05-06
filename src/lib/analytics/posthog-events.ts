import posthog from "posthog-js"

/** Safe client-side PostHog capture — no PII; only after posthog-js init */
export function captureEvent(
  event: string,
  properties?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return
  try {
    posthog.capture(event, properties)
  } catch {
    /* noop */
  }
}

export const PH_STORE = {
  cabinCheckout: "sila_ph_cabin_checkout",
  transportCheckout: "sila_ph_transport_checkout",
  rideSharePending: "sila_ph_ride_share_pending",
} as const
