import { createClient } from "@/lib/supabase-server"
import { getNavUserForPage } from "@/lib/getNavUser"
import Navbar from "@/components/layout/Navbar"
import TransportClient from "./TransportClient"
import type { RideShareCardData } from "./components/TransportCard"
import type { OpenTransportRequest } from "./TransportClient"

export const metadata = {
  title: "Samsejlads i Grønland — Sila.gl",
  description: "Find lokale sejlere der tilbyder pladser langs Grønlands kyst.",
}

export const dynamic = "force-dynamic"

export default async function TransportPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const navUser = user ? await getNavUserForPage(supabase, user) : null

  const [{ data: rideShareData }, { data: requestData }] = await Promise.all([
    supabase
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
      .order("departure_at", { ascending: true }),

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
      <TransportClient rideShares={rideShares} openRequests={openRequests} />
    </main>
  )
}
