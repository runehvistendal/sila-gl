import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase-server"
import { createServiceClient } from "@/lib/supabase-service"
import { resolveDisplayName } from "@/lib/getNavUser"
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

/* Ingen fuld-route-cache: skal altid afspejle frisk role_type fra DB. */
export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function DashboardPage() {
  // eslint-disable-next-line no-console
  console.log('[env check]', process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 10))

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/")

  /* ── Profile + my cabins + my boats (først — reconcile før resten) ── */
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, role_type, location, avatar_url")
    .eq("id", user.id)
    .maybeSingle()

  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.log("[dashboard] profiles query (user / RLS):", {
      userId: user.id,
      role_type: profile?.role_type ?? null,
      profileError: profileError?.message ?? null,
      hadRow: profile != null,
    })
  }

  const [{ data: myCabinsRaw }, { data: myBoatsRaw }] = await Promise.all([
    supabase
      .from("cabins")
      .select("id, title, location_hub, price_per_night_ore, images, published")
      .eq("owner_id", user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("boats")
      .select("id, name, boat_type, capacity")
      .eq("owner_id", user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
  ])

  const cabinRowCount = myCabinsRaw?.length ?? 0
  const boatRowCount = myBoatsRaw?.length ?? 0
  const hasAssets = cabinRowCount > 0 || boatRowCount > 0

  let roleType =
    (profile?.role_type as "traveler" | "provider" | "both" | undefined) ?? "traveler"
  let profileRow = profile

  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.log("[dashboard/reconcile:inputs]", {
      authUserId: user.id,
      profiles_role_type: profile?.role_type ?? null,
      profileError: profileError?.message ?? null,
      cabinsRowCount: cabinRowCount,
      boatsRowCount: boatRowCount,
      willRunUpdate: hasAssets && roleType === "traveler",
    })
  }

  if (hasAssets && roleType === "traveler") {
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.log("[dashboard/reconcile] running UPDATE profiles SET role_type = both", {
        useServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      })
    }
    const updateClient = process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createServiceClient()
      : supabase
    const { error: roleUpErr } = await updateClient
      .from("profiles")
      .update({ role_type: "both" })
      .eq("id", user.id)
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.log("[dashboard/reconcile] UPDATE result", {
        error: roleUpErr?.message ?? null,
        ran: true,
      })
    }
    if (!roleUpErr) {
      const { data: profileAfter, error: afterErr } = await supabase
        .from("profiles")
        .select("full_name, role_type, location, avatar_url")
        .eq("id", user.id)
        .maybeSingle()
      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.log("[dashboard/reconcile] profile re-fetched after UPDATE", {
          role_type: profileAfter?.role_type ?? null,
          reFetchError: afterErr?.message ?? null,
        })
      }
      if (profileAfter) {
        profileRow = profileAfter
      }
      {
        const rt = profileRow?.role_type
        if (rt === "both" || rt === "provider") {
          roleType = rt
        } else {
          /* UPDATE lykkedes; vis provider-tabs selv hvis re-fetch mangler eller er stale */
          roleType = "both"
        }
      }
    }
  } else if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.log("[dashboard/reconcile] UPDATE skipped", {
      hasAssets,
      roleType,
    })
  }

  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { data: svcProfile, error: svcErr } = await createServiceClient()
      .from("profiles")
      .select("full_name, role_type, location, avatar_url")
      .eq("id", user.id)
      .maybeSingle()
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.log("[dashboard] profile read (service / authoritative):", {
        userId: user.id,
        role_type: svcProfile?.role_type ?? null,
        error: svcErr?.message ?? null,
      })
    }
    if (svcProfile) {
      profileRow = svcProfile
      const rt = String(svcProfile.role_type ?? "").toLowerCase()
      if (rt === "traveler" || rt === "provider" || rt === "both") {
        roleType = rt
      }
    }
  }

  const displayNameResolved = resolveDisplayName(profileRow, user)
  const av = (profileRow as { avatar_url?: string | null } | null)?.avatar_url
  const navUser = {
    id: user.id,
    fullName: displayNameResolved,
    avatarUrl: av && String(av).trim() ? String(av).trim() : null,
  }

  const isProvider = roleType === "provider" || roleType === "both"
  const isTraveler = roleType === "traveler" || roleType === "both"

  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.log("[dashboard] → DashboardClient props", {
      roleType,
      isProvider,
      isTraveler,
    })
  }

  const cabinIds = (myCabinsRaw ?? []).map((c: { id: string }) => c.id)

  /* ── Parallel data fetching (resterende — genbruger myCabinsRaw / myBoatsRaw) ── */
  const [
    { data: myBookingsRaw },
    { data: hostBookingsRaw },
    { data: myRideSharesRaw },
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
    cabinIds.length > 0
      ? supabase
          .from("cabin_bookings")
          .select(`
        id, status, check_in, check_out, num_guests, total_price_ore, guest_message, created_at,
        cabins!cabin_id(title),
        profiles!guest_id(full_name)
      `)
          .in("cabin_id", cabinIds)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(30)
      : Promise.resolve({ data: [] }),

    // My ride shares
    supabase
      .from("ride_shares")
      .select("id, from_location, to_location, departure_at, seats_available, status")
      .eq("skipper_id", user.id)
      .is("deleted_at", null)
      .order("departure_at", { ascending: false }),

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

  const homeCity =
    (profileRow?.location as string | null | undefined) ?? null

  return (
    <main>
      <Navbar user={navUser} />
      <DashboardClient
        displayName={displayNameResolved}
        roleType={roleType}
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
