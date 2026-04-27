import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase-server"
import Navbar from "@/components/layout/Navbar"
import DashboardClient from "./DashboardClient"
import type { CabinBookingData } from "./components/BookingRow"
import type { TransportRequestData } from "./components/OpenRequestsList"

interface BoatData {
  id: string
  name: string
  boat_type: string | null
  capacity: number
}

export const metadata = { title: "Mit dashboard — Sila.gl" }

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/")

  const navUser = {
    id:    user.id,
    email: user.email ?? null,
    name:  (user.user_metadata?.full_name as string) ?? (user.user_metadata?.name as string) ?? null,
  }

  /* ── Profile ── */
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role_type, location")
    .eq("id", user.id)
    .single()

  /* ── Parallel data fetching ── */
  const [
    { data: myBookingsRaw },
    { data: hostBookingsRaw },
    { data: myCabinsRaw },
    { data: myRideSharesRaw },
    { data: myBoatsRaw },
    { data: openTransportRaw },
    { data: myTransportReqRaw },
    { data: reviewsRaw },
    { count: unreadCount },
  ] = await Promise.all([
    // My bookings as guest
    supabase
      .from("cabin_bookings")
      .select("id, status, check_in, check_out, num_guests, total_price_ore, guest_message, created_at, cabins!cabin_id(title)")
      .eq("guest_id", user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(30),

    // Host bookings — bookings on cabins I own
    supabase
      .from("cabin_bookings")
      .select(`
        id, status, check_in, check_out, num_guests, total_price_ore, guest_message, created_at,
        cabins!cabin_id(title),
        profiles!guest_id(full_name)
      `)
      .in(
        "cabin_id",
        (await supabase
          .from("cabins")
          .select("id")
          .eq("owner_id", user.id)
          .is("deleted_at", null)
          .then((r) => r.data?.map((c: { id: string }) => c.id) ?? [])
        )
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(30),

    // My cabins
    supabase
      .from("cabins")
      .select("id, title, location_hub, price_per_night_ore, images, published")
      .eq("owner_id", user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),

    // My ride shares
    supabase
      .from("ride_shares")
      .select("id, from_location, to_location, departure_at, seats_available, status")
      .eq("skipper_id", user.id)
      .is("deleted_at", null)
      .order("departure_at", { ascending: false }),

    // My boats
    supabase
      .from("boats")
      .select("id, name, boat_type, capacity")
      .eq("owner_id", user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),

    // Open transport requests (for providers to see)
    supabase
      .from("transport_requests")
      .select("id, from_location, to_location, desired_date, num_passengers, status, description, profiles!guest_id(full_name)")
      .eq("status", "open")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(100),

    // My transport requests (as requester)
    supabase
      .from("transport_requests")
      .select("id, from_location, to_location, desired_date, num_passengers, status")
      .eq("guest_id", user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(30),

    // Reviews about me
    supabase
      .from("reviews")
      .select("id, rating, comment, created_at, profiles!reviewer_id(full_name)")
      .eq("reviewee_id", user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(20),

    // Unread messages count
    supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", user.id)
      .is("read_at", null),
  ])

  /* ── Shape data ── */
  const myBookings: CabinBookingData[] = (myBookingsRaw ?? []).map((b: Record<string, unknown>) => ({
    id:              b.id as string,
    status:          b.status as string,
    check_in:        b.check_in as string,
    check_out:       b.check_out as string,
    num_guests:      b.num_guests as number,
    total_price_ore: b.total_price_ore as number,
    guest_message:   b.guest_message as string | null,
    created_at:      b.created_at as string,
    cabin_title:     (b.cabins as { title?: string } | null)?.title ?? null,
    guest_name:      null,
  }))

  const hostBookings: CabinBookingData[] = (hostBookingsRaw ?? []).map((b: Record<string, unknown>) => ({
    id:              b.id as string,
    status:          b.status as string,
    check_in:        b.check_in as string,
    check_out:       b.check_out as string,
    num_guests:      b.num_guests as number,
    total_price_ore: b.total_price_ore as number,
    guest_message:   b.guest_message as string | null,
    created_at:      b.created_at as string,
    cabin_title:     (b.cabins as { title?: string } | null)?.title ?? null,
    guest_name:      (b.profiles as { full_name?: string } | null)?.full_name ?? null,
  }))

  const openTransportRequests: TransportRequestData[] = (openTransportRaw ?? []).map((r: Record<string, unknown>) => ({
    id:              r.id as string,
    from_location:   r.from_location as string,
    to_location:     r.to_location as string,
    desired_date:    r.desired_date as string,
    num_passengers:  r.num_passengers as number,
    status:          r.status as string,
    description:     r.description as string | null,
    profiles:        r.profiles as { full_name: string | null } | null,
  }))

  /* ── Role — default to 'both' so all tabs show when role_type is NULL ── */
  const roleType   = profile?.role_type ?? "both"
  const isProvider = roleType === "provider" || roleType === "both"
  const isTraveler = roleType === "traveler" || roleType === "both"
  const displayName = profile?.full_name ?? null
  const homeCity    = (profile as Record<string, unknown> | null)?.location as string | null ?? null

  return (
    <main>
      <Navbar user={navUser} />
      <DashboardClient
        displayName={displayName}
        isProvider={isProvider}
        isTraveler={isTraveler}
        homeCity={homeCity}
        myBookings={myBookings}
        hostBookings={hostBookings}
        myCabins={(myCabinsRaw ?? []) as Parameters<typeof DashboardClient>[0]["myCabins"]}
        myRideShares={(myRideSharesRaw ?? []) as Parameters<typeof DashboardClient>[0]["myRideShares"]}
        myBoats={(myBoatsRaw ?? []) as BoatData[]}
        openTransportRequests={openTransportRequests}
        myTransportRequests={(myTransportReqRaw ?? []) as Parameters<typeof DashboardClient>[0]["myTransportRequests"]}
        reviews={(reviewsRaw ?? []).map((r: Record<string, unknown>) => ({
          id:         r.id as string,
          rating:     r.rating as number,
          comment:    r.comment as string | null,
          created_at: r.created_at as string,
          profiles:   r.profiles as { full_name: string | null } | null,
        }))}
        unreadMessages={unreadCount ?? 0}
      />
    </main>
  )
}
