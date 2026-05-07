import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { createClient } from "@/lib/supabase-server"
import { getNavUserForPage } from "@/lib/getNavUser"
import Navbar from "@/components/layout/Navbar"
import { buildMetadata } from "@/lib/metadata"
import TransportClient from "./TransportClient"
import type { RideShareCardData } from "./components/TransportCard"
import type { OpenTransportRequest } from "./TransportClient"

export const dynamic = "force-dynamic"

interface SearchParams {
  date?: string
  hub?: string
  guests?: string
}

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<SearchParams>
}

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/

/** Konvertér YYYY-MM-DD til UTC ISO ved midnat i Nuuk-tid (UTC-3, ingen sommertid). */
function nuukDateToUtcIso(ymd: string): string | null {
  if (!YMD_RE.test(ymd)) return null
  const d = new Date(`${ymd}T00:00:00-03:00`)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "transport" })
  return buildMetadata({
    locale,
    title: t("pageTitle"),
    description: t("metaDescription"),
    path: "/transport",
  })
}

export default async function TransportPage({ params, searchParams }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const navUser = user ? await getNavUserForPage(supabase, user) : null

  const sp = await searchParams
  const dateParam = YMD_RE.test(sp.date ?? "") ? sp.date! : ""
  const hubParam = (sp.hub ?? "").trim()
  const guestsParsed = Number.parseInt(String(sp.guests ?? ""), 10)
  const guestsParam =
    Number.isFinite(guestsParsed) && guestsParsed >= 1 && guestsParsed <= 20
      ? guestsParsed
      : 0
  const departureCutoff = dateParam ? nuukDateToUtcIso(dateParam) : null

  let rideShareQuery = supabase
    .from("ride_shares")
    .select(`
      id, sejler_id:skipper_id, from_location, to_location, departure_at,
      seats_available, total_seats, price_per_seat_ore,
      boat_description, description, status,
      from_latitude, from_longitude, to_latitude, to_longitude,
      return_ride_share_id,
      profiles!skipper_id ( full_name, avatar_url ),
      return_trip:return_ride_share_id ( id, from_location, to_location, departure_at, seats_available, price_per_seat_ore, status )
    `)
    .in("status", ["active", "full"])

  if (departureCutoff) {
    rideShareQuery = rideShareQuery.gte("departure_at", departureCutoff)
  }

  rideShareQuery = rideShareQuery.order("departure_at", { ascending: true })

  const [{ data: rideShareData }, { data: requestData }] = await Promise.all([
    rideShareQuery,

    supabase
      .from("transport_requests")
      .select("id, from_location, to_location, desired_date, num_passengers, trip_type, status")
      .eq("status", "open")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(20),
  ])

  const rideShares = (rideShareData ?? []) as unknown as RideShareCardData[]
  const openRequests = (requestData ?? []) as OpenTransportRequest[]

  return (
    <main>
      <Navbar user={navUser} />
      <TransportClient
        rideShares={rideShares}
        openRequests={openRequests}
        initialDate={dateParam}
        initialHub={hubParam}
        initialGuests={guestsParam}
      />
    </main>
  )
}
