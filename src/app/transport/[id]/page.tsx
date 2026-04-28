import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase-server"
import { getNavUserForPage } from "@/lib/getNavUser"
import Navbar from "@/components/layout/Navbar"
import TransportDetailClient from "./TransportDetailClient"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function TransportDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const navUser = user ? await getNavUserForPage(supabase, user) : null

  const { data: rideShare, error } = await supabase
    .from("ride_shares")
    .select(`
      id, sejler_id:skipper_id, from_location, to_location, departure_at,
      seats_available, total_seats, price_per_seat_ore,
      boat_description, description, status,
      from_latitude, from_longitude, to_latitude, to_longitude,
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
      .neq("id", id)
      .order("departure_at", { ascending: true })
      .limit(5),

    // Alternative returture fra ANDRE sejlere (vises kun når ingen direkte kobling)
    supabase
      .from("ride_shares")
      .select(`
        id, sejler_id:skipper_id, from_location, to_location, departure_at,
        seats_available, total_seats, price_per_seat_ore,
        boat_description, description, status,
        profiles!skipper_id ( id, full_name, avatar_url )
      `)
      .eq("from_location", rs.to_location)
      .in("status", ["active", "full"])
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

  return (
    <main>
      <Navbar user={navUser} />
      <TransportDetailClient
        rideShare={rs}
        returnTrips={(returnTripsRes.data ?? []) as typeof rs[]}
        alternativeReturnTrips={(altReturnTripsRes.data ?? []) as typeof rs[]}
        reviews={(reviewsRes.data ?? []) as any[]}
        isLoggedIn={!!user}
      />
    </main>
  )
}
