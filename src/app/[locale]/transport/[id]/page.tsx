import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { createClient } from "@/lib/supabase-server"
import { getNavUserForPage } from "@/lib/getNavUser"
import Navbar from "@/components/layout/Navbar"
import TransportDetailClient from "./TransportDetailClient"
import { buildMetadata } from "@/lib/metadata"
import { JsonLd } from "@/components/seo/JsonLd"
import { getLocationName } from "@/lib/greenlandLocations"
import { hoursUntil } from "@/lib/rideSharePolicy"

interface PageProps {
  params: Promise<{ id: string; locale: string }>
}

export async function generateMetadata({ params }: { params: Promise<{ id: string; locale: string }> }): Promise<Metadata> {
  const { id, locale } = await params
  const supabase = await createClient()
  const { data: rs } = await supabase
    .from("ride_shares")
    .select("from_location, to_location, departure_at, description")
    .eq("id", id)
    .single()

  if (!rs) return { title: "Sila.gl" }

  const t = await getTranslations({ locale, namespace: "transport" })
  const from = getLocationName(rs.from_location)
  const to = getLocationName(rs.to_location)
  const title = `${from} → ${to}`
  const description = rs.description ?? t("metaDescription")

  return buildMetadata({
    locale,
    title,
    description,
    path: `/transport/${id}`,
  })
}

export default async function TransportDetailPage({ params }: PageProps) {
  const { id, locale } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const navUser = user ? await getNavUserForPage(supabase, user) : null

  const { data: rideShare, error } = await supabase
    .from("ride_shares")
    .select(`
      id, sejler_id:skipper_id, from_location, to_location, departure_at,
      seats_available, total_seats, price_per_seat_ore,
      boat_description, description, status, return_ride_share_id,
      from_latitude, from_longitude, to_latitude, to_longitude,
      estimated_duration_minutes, meeting_point, luggage_allowance, flexibility_minutes,
      boats ( name, capacity, safety_confirmed, operator_type ),
      profiles!skipper_id ( id, full_name, avatar_url )
    `)
    .eq("id", id)
    .in("status", ["active", "full"])
    .single()

  if (error || !rideShare) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rs = rideShare as any

  const [returnTripsRes, altReturnTripsRes, reviewsRes] = await Promise.all([
    // Returture fra SAMME sejler (direkte kobling)
    supabase
      .from("ride_shares")
      .select(`
        id, sejler_id:skipper_id, from_location, to_location, departure_at,
        seats_available, total_seats, price_per_seat_ore,
        boat_description, description, status,
        profiles!skipper_id ( id, full_name, avatar_url )
      `)
      .eq("from_location", rs.to_location)
      .eq("to_location", rs.from_location)
      .eq("skipper_id", rs.sejler_id)
      .in("status", ["active", "full"])
      .is("deleted_at", null)
      .gt("departure_at", rs.departure_at)
      .neq("id", id)
      .order("departure_at", { ascending: true })
      .limit(5),

    // Returture fra ANDRE sejlere på den omvendte rute
    supabase
      .from("ride_shares")
      .select(`
        id, sejler_id:skipper_id, from_location, to_location, departure_at,
        seats_available, total_seats, price_per_seat_ore,
        boat_description, description, status,
        profiles!skipper_id ( id, full_name, avatar_url )
      `)
      .eq("from_location", rs.to_location)
      .eq("to_location", rs.from_location)
      .in("status", ["active", "full"])
      .is("deleted_at", null)
      .gt("departure_at", rs.departure_at)
      .neq("id", id)
      .neq("skipper_id", rs.sejler_id)
      .order("departure_at", { ascending: true })
      .limit(5),

    supabase
      .from("reviews")
      .select(`
        id, rating, comment, created_at,
        profiles!reviewer_id ( full_name )
      `)
      .eq("reviewee_id", rs.profiles?.id ?? "")
      .not("published_at", "is", null)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(20),
  ])

  const tripSchema = {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: `${getLocationName(rs.from_location)} → ${getLocationName(rs.to_location)}`,
    description: rs.description,
    url: `https://sila.gl/${locale}/transport/${id}`,
    touristType: "Adventure",
    offers: {
      "@type": "Offer",
      price: rs.price_per_seat_ore / 100,
      priceCurrency: "DKK",
      availability:
        rs.seats_available > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/SoldOut",
    },
  }

  return (
    <main>
      <JsonLd data={tripSchema} />
      <Navbar user={navUser} />
      <TransportDetailClient
        rideShare={rs}
        returnTrips={(returnTripsRes.data ?? []) as typeof rs[]}
        alternativeReturnTrips={(altReturnTripsRes.data ?? []) as typeof rs[]}
        reviews={(reviewsRes.data ?? []) as unknown as React.ComponentProps<typeof TransportDetailClient>["reviews"]}
        isLoggedIn={!!user}
        isOwnTrip={!!user && user.id === rs.sejler_id}
        departed={hoursUntil(rs.departure_at) <= 0}
      />
    </main>
  )
}
