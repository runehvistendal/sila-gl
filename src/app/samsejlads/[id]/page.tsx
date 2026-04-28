import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase-server"
import { getNavUserForPage } from "@/lib/getNavUser"
import Navbar from "@/components/layout/Navbar"
import SamsejladsDetailClient from "./SamsejladsDetailClient"

export const dynamic = "force-dynamic"

export interface RideShareDetail {
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
  profiles: {
    id: string
    full_name: string | null
    avatar_url: string | null
  } | null
}

export default async function SamsejladsDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const navUser = user ? await getNavUserForPage(supabase, user) : null

  const { data, error } = await supabase
    .from("ride_shares")
    .select(`
      id, sejler_id:skipper_id,
      from_location, to_location, departure_at,
      seats_available, total_seats, price_per_seat_ore,
      boat_description, description, status,
      profiles!skipper_id ( id, full_name, avatar_url )
    `)
    .eq("id", id)
    .in("status", ["active", "full"])
    .is("deleted_at", null)
    .single()

  if (error || !data) notFound()

  const rs = data as unknown as RideShareDetail

  // Reviews about the sejler
  const sejlerId = rs.profiles?.id ?? rs.sejler_id
  const { data: reviewsRaw } = await supabase
    .from("reviews")
    .select("id, rating, comment, created_at, profiles!reviewer_id(full_name)")
    .eq("reviewee_id", sejlerId)
    .not("published_at", "is", null)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(10)

  return (
    <main>
      <Navbar user={navUser} />
      <SamsejladsDetailClient
        rideShare={rs}
        reviews={(reviewsRaw ?? []) as unknown as Array<{
          id: string
          rating: number
          comment: string | null
          created_at: string
          profiles: { full_name: string | null } | null
        }>}
        currentUserId={user?.id ?? null}
      />
    </main>
  )
}
