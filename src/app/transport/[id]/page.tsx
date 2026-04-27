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
      profiles!skipper_id ( id, full_name, avatar_url )
    `)
    .eq("id", id)
    .single()

  if (error || !rideShare) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rs = rideShare as any

  const [returnTripsRes, reviewsRes] = await Promise.all([
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
      .eq("status", "active")
      .neq("id", id)
      .order("departure_at", { ascending: true })
      .limit(5),

    supabase
      .from("reviews")
      .select(`
        id, rating, comment, created_at,
        profiles!reviewer_id ( full_name )
      `)
      .eq("reviewee_id", rs.profiles?.id ?? "")
      .order("created_at", { ascending: false })
      .limit(20),
  ])

  return (
    <main>
      <Navbar user={navUser} />
      <TransportDetailClient
        rideShare={rs}
        returnTrips={(returnTripsRes.data ?? []) as typeof rs[]}
        reviews={(reviewsRes.data ?? []) as any[]}
        isLoggedIn={!!user}
      />
    </main>
  )
}
