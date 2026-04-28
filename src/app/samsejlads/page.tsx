import { createClient } from "@/lib/supabase-server"
import { getNavUserForPage } from "@/lib/getNavUser"
import Navbar from "@/components/layout/Navbar"
import SamsejladsClient from "./SamsejladsClient"

export const metadata = {
  title: "Samsejlads i Grønland — Sila.gl",
  description: "Rejs med lokale sejlere langs Grønlands kyst. Find ledige pladser og book din plads.",
}

export const dynamic = "force-dynamic"

export interface RideShareCardData {
  id: string
  sejler_id: string
  from_location: string
  to_location: string
  departure_at: string
  seats_available: number
  total_seats: number
  price_per_seat_ore: number
  boat_description: string | null
  description: string | null
  status: string
  profiles: { full_name: string | null; avatar_url: string | null } | null
}

export default async function SamsejladsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const navUser = user ? await getNavUserForPage(supabase, user) : null

  const { data } = await supabase
    .from("ride_shares")
    .select(`
      id, sejler_id:skipper_id,
      from_location, to_location, departure_at,
      seats_available, total_seats, price_per_seat_ore,
      boat_description, description, status,
      profiles!skipper_id ( full_name, avatar_url )
    `)
    .in("status", ["active", "full"])
    .is("deleted_at", null)
    .order("departure_at", { ascending: true })

  const rideShares = (data ?? []) as unknown as RideShareCardData[]

  return (
    <main>
      <Navbar user={navUser} />
      <SamsejladsClient rideShares={rideShares} />
    </main>
  )
}
