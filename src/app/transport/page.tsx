import { createClient } from "@/lib/supabase-server"
import Navbar from "@/components/layout/Navbar"
import TransportClient from "./TransportClient"
import type { RideShareCardData } from "./components/TransportCard"

export const metadata = {
  title: "Samsejlads i Grønland — Sila.gl",
  description: "Find lokale sejlere der tilbyder pladser langs Grønlands kyst.",
}

export default async function TransportPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const navUser = user
    ? {
        id:    user.id,
        email: user.email ?? null,
        name:
          (user.user_metadata?.full_name as string) ??
          (user.user_metadata?.name as string) ??
          null,
      }
    : null

  const { data, error } = await supabase
    .from("ride_shares")
    .select(`
      id, skipper_id, from_location, to_location, departure_at,
      seats_available, total_seats, price_per_seat_ore,
      boat_description, description, status,
      profiles!skipper_id ( full_name, avatar_url )
    `)
    .eq("status", "active")
    .gt("seats_available", 0)
    .order("departure_at", { ascending: true })

  if (error) console.error("[transport] Supabase error:", error)

  const rideShares = (data ?? []) as unknown as RideShareCardData[]

  return (
    <main>
      <Navbar user={navUser} />
      <TransportClient rideShares={rideShares} />
    </main>
  )
}
