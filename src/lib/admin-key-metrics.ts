import { createServiceClient } from "@/lib/supabase-service"

export type MonthlyRevenueRow = {
  month_start: string
  total_ore: string | number
}

export type AdminKeyMetricsRaw = {
  cabin_revenue_total_ore: string | number
  ride_share_revenue_total_ore: string | number
  transport_revenue_total_ore: string | number
  platform_fee_total_ore: string | number
  revenue_last_30d_ore: string | number
  monthly_revenue: MonthlyRevenueRow[] | null
  bookings_cabin_confirmed: string | number
  bookings_ride_share_confirmed: string | number
  bookings_transport_accepted: string | number
  bookings_cabin_confirmed_30d: string | number
  bookings_ride_share_confirmed_30d: string | number
  bookings_transport_accepted_30d: string | number
  bookings_cancelled_cabin: string | number
  bookings_cancelled_ride_share: string | number
  avg_booking_value_ore: string | number
  users_total: string | number
  users_new_30d: string | number
  users_role_traveler: string | number
  users_role_provider: string | number
  users_role_both: string | number
  cabins_published: string | number
  cabins_draft: string | number
  skippers_with_ride_share: string | number
  profiles_stripe_onboarding_complete: string | number
  cabin_requests_open: string | number
  transport_requests_open: string | number
}

function n(v: string | number | undefined): number {
  if (v === undefined || v === null) return 0
  return typeof v === "number" ? v : Number(v)
}

/** Sidste 6 kalendermåneder (inkl. indeværende), YYYY-MM */
export function lastSixMonthKeysUtc(): string[] {
  const out: string[] = []
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth()
  for (let back = 5; back >= 0; back--) {
    const d = new Date(Date.UTC(y, m - back, 1))
    const ym = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
    out.push(ym)
  }
  return out
}

export function padMonthlyRevenue(
  rows: MonthlyRevenueRow[] | null | undefined,
  locale: string,
): { monthLabel: string; totalOre: number }[] {
  const byYm = new Map<string, number>()
  for (const row of rows ?? []) {
    const start = row.month_start
    const key = start.length >= 7 ? start.slice(0, 7) : start
    byYm.set(key, n(row.total_ore))
  }
  const keys = lastSixMonthKeysUtc()
  const fmt = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "da-DK", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })
  return keys.map((ym) => {
    const [ys, ms] = ym.split("-").map(Number)
    const label = fmt.format(new Date(Date.UTC(ys, ms - 1, 1)))
    return { monthLabel: label, totalOre: byYm.get(ym) ?? 0 }
  })
}

export async function fetchAdminKeyMetrics(): Promise<AdminKeyMetricsRaw | null> {
  const svc = createServiceClient()
  const { data, error } = await svc.rpc("admin_key_metrics")
  if (error) {
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console -- admin debug
      console.error("[admin_key_metrics]", error.message)
    }
    return null
  }
  if (data == null || typeof data !== "object") return null
  return data as AdminKeyMetricsRaw
}

export function toNumberMetrics(m: AdminKeyMetricsRaw) {
  return {
    cabinRevenue: n(m.cabin_revenue_total_ore),
    rideShareRevenue: n(m.ride_share_revenue_total_ore),
    transportRevenue: n(m.transport_revenue_total_ore),
    platformFee: n(m.platform_fee_total_ore),
    revenueLast30d: n(m.revenue_last_30d_ore),
    revenueTotal:
      n(m.cabin_revenue_total_ore) +
      n(m.ride_share_revenue_total_ore) +
      n(m.transport_revenue_total_ore),
    avgBooking: n(m.avg_booking_value_ore),
    bookingsCabin: n(m.bookings_cabin_confirmed),
    bookingsRide: n(m.bookings_ride_share_confirmed),
    bookingsTransport: n(m.bookings_transport_accepted),
    bookingsCabin30d: n(m.bookings_cabin_confirmed_30d),
    bookingsRide30d: n(m.bookings_ride_share_confirmed_30d),
    bookingsTransport30d: n(m.bookings_transport_accepted_30d),
    bookingsTotal:
      n(m.bookings_cabin_confirmed) +
      n(m.bookings_ride_share_confirmed) +
      n(m.bookings_transport_accepted),
    bookingsTotal30d:
      n(m.bookings_cabin_confirmed_30d) +
      n(m.bookings_ride_share_confirmed_30d) +
      n(m.bookings_transport_accepted_30d),
    cancelledCabin: n(m.bookings_cancelled_cabin),
    cancelledRide: n(m.bookings_cancelled_ride_share),
    cancelledTotal: n(m.bookings_cancelled_cabin) + n(m.bookings_cancelled_ride_share),
    usersTotal: n(m.users_total),
    usersNew30d: n(m.users_new_30d),
    roleTraveler: n(m.users_role_traveler),
    roleProvider: n(m.users_role_provider),
    roleBoth: n(m.users_role_both),
    cabinsPublished: n(m.cabins_published),
    cabinsDraft: n(m.cabins_draft),
    skippers: n(m.skippers_with_ride_share),
    stripeOnboarding: n(m.profiles_stripe_onboarding_complete),
    cabinRequestsOpen: n(m.cabin_requests_open),
    transportRequestsOpen: n(m.transport_requests_open),
  }
}
