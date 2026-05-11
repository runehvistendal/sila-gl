import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase-server"
import { createServiceClient } from "@/lib/supabase-service"
import { resolveDisplayName, type NavUser } from "@/lib/getNavUser"
import { getUnreadCount, getUnreadStayOfferReceivedCount } from "@/lib/notifications"
import Navbar from "@/components/layout/Navbar"
import DashboardClient from "./DashboardClient"
import type { CabinBookingData } from "./components/BookingRow"
import type { TransportRequestData } from "./components/OpenRequestsList"
import type { RideShareBookingRowData } from "./components/RideShareBookingRow"
import type { TransportOfferBookingRowData } from "./components/TransportOfferBookingRow"
import type { StayOfferBookingRowData } from "./components/StayOfferBookingRow"

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
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/")

  /* ── Profile + my cabins + my boats (først — reconcile før resten) ── */
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, role_type, location, avatar_url, language")
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
      .select("id, title, location_hub, price_per_night_ore, images, published, property_type")
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
        .select("full_name, role_type, location, avatar_url, language")
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
      .select("full_name, role_type, location, avatar_url, language")
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
  const pr = profileRow as {
    avatar_url?: string | null
    language?: string | null
  } | null
  const av = pr?.avatar_url
  const rawNavLang = pr?.language
  const navLanguage: "da" | "en" | "kl" =
    rawNavLang === "en" || rawNavLang === "kl" ? rawNavLang : "da"

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
    { data: myCabinReqRaw },
    { data: guestCabinReqRaw },
    { data: reviewsRaw },
    { data: myReviewedRaw },
    { count: unreadCount },
    navUnreadTotal,
    unreadStayOfferNotifCount,
  ] = await Promise.all([
    // My bookings as guest — include cabin owner info + price for details
    supabase
      .from("cabin_bookings")
      .select(`
        id, cabin_id, status, check_in, check_out, num_guests,
        total_price_ore, platform_fee_ore, stripe_payment_intent_id,
        guest_message, created_at,
        cabins!cabin_id(title, owner_id, price_per_night_ore, property_type, profiles!owner_id(full_name))
      `)
      .eq("guest_id", user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(30),

    // Host bookings — include guest profile for reviews + price breakdown
    cabinIds.length > 0
      ? supabase
          .from("cabin_bookings")
          .select(`
            id, cabin_id, guest_id, status, check_in, check_out, num_guests,
            total_price_ore, platform_fee_ore, stripe_payment_intent_id,
            guest_message, created_at,
            cabins!cabin_id(title, price_per_night_ore, property_type),
            profiles!guest_id(id, full_name, avatar_url)
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

    // My transport requests (as requester) + offer count
    supabase
      .from("transport_requests")
      .select("id, from_location, to_location, desired_date, num_passengers, status, transport_offers(count)")
      .eq("guest_id", user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(30),

    // My cabin requests (as guest)
    supabase
      .from("stay_requests")
      .select(
        "id, location, desired_check_in, desired_check_out, num_guests, max_price_ore, description, status, created_at, property_type, needs_transport, stay_offers ( id, status )",
      )
      .eq("guest_id", user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(30),

    // Cabin requests to my cabins (as provider)
    cabinIds.length > 0
      ? supabase
          .from("stay_requests")
          .select(
            "id, cabin_id, location, desired_check_in, desired_check_out, num_guests, max_price_ore, description, status, created_at, property_type, needs_transport, profiles!guest_id(id, full_name, avatar_url), stay_offers ( id, status, provider_id )",
          )
          .or(`cabin_id.in.(${cabinIds.join(",")}),cabin_id.is.null`)
          .eq("status", "open")
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(50)
      : Promise.resolve({ data: [] }),

    // Reviews about me (reviewee)
    supabase
      .from("reviews")
      .select("id, rating, comment, created_at, profiles!reviewer_id(full_name)")
      .eq("reviewee_id", user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(20),

    // Reviews I have written (to know which bookings are already reviewed)
    supabase
      .from("reviews")
      .select("cabin_booking_id, ride_share_booking_id, transport_offer_id")
      .eq("reviewer_id", user.id)
      .is("deleted_at", null),

    // Unread messages count
    supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", user.id)
      .is("read_at", null),

    getUnreadCount(supabase, user.id),
    getUnreadStayOfferReceivedCount(supabase, user.id),
  ])

  const [
    { data: rsPassengerRaw },
    { data: rsSkipperRaw },
    { data: toGuestRaw },
    { data: toSkipperRaw },
    { data: stayGuestOffersRaw },
    { data: stayProviderOffersRaw },
    { data: guestStripeSessionsRaw },
    { data: hostStripeSessionsRaw },
  ] = await Promise.all([
    supabase
      .from("ride_share_bookings")
      .select(`
        id, status, num_seats, total_price_ore, created_at, updated_at, passenger_id,
        ride_shares!inner (
          from_location, to_location, departure_at, skipper_id,
          profiles!skipper_id ( full_name )
        )
      `)
      .eq("passenger_id", user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("ride_share_bookings")
      .select(`
        id, status, num_seats, total_price_ore, created_at, updated_at, passenger_id,
        ride_shares!inner ( from_location, to_location, departure_at, skipper_id ),
        profiles!passenger_id ( full_name )
      `)
      .eq("ride_shares.skipper_id", user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("transport_offers")
      .select(`
        id, status, price_ore, created_at, updated_at, skipper_id,
        transport_requests!inner ( from_location, to_location, desired_date, num_passengers, guest_id ),
        profiles!skipper_id ( full_name )
      `)
      .eq("transport_requests.guest_id", user.id)
      .eq("status", "accepted")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("transport_offers")
      .select(`
        id, status, price_ore, created_at, updated_at, skipper_id,
        transport_requests!inner (
          from_location, to_location, desired_date, num_passengers, guest_id,
          profiles!guest_id ( full_name )
        )
      `)
      .eq("skipper_id", user.id)
      .eq("status", "accepted")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("stay_offers")
      .select(`
        id, status, stripe_session_id,
        cabins ( title ),
        stay_requests!inner ( guest_id, desired_check_in, desired_check_out, num_guests )
      `)
      .eq("status", "accepted")
      .eq("stay_requests.guest_id", user.id)
      .is("deleted_at", null)
      .limit(20),
    supabase
      .from("stay_offers")
      .select(`
        id, status, stripe_session_id,
        cabins ( title ),
        stay_requests ( desired_check_in, desired_check_out, num_guests )
      `)
      .eq("status", "accepted")
      .eq("provider_id", user.id)
      .is("deleted_at", null)
      .limit(20),
    supabase
      .from("cabin_bookings")
      .select("stripe_session_id")
      .eq("guest_id", user.id)
      .not("stripe_session_id", "is", null)
      .is("deleted_at", null),
    cabinIds.length > 0
      ? supabase
          .from("cabin_bookings")
          .select("stripe_session_id")
          .in("cabin_id", cabinIds)
          .not("stripe_session_id", "is", null)
          .is("deleted_at", null)
      : Promise.resolve({ data: [] as { stripe_session_id: string | null }[] | null }),
  ])

  const navUser: NavUser = {
    id: user.id,
    fullName: displayNameResolved,
    avatarUrl: av && String(av).trim() ? String(av).trim() : null,
    language: navLanguage,
    unreadCount: navUnreadTotal,
  }

  /* ── Already-reviewed booking IDs ── */
  const myReviewedCabinBookingIds = new Set(
    (myReviewedRaw ?? [])
      .map((r: Record<string, unknown>) => r.cabin_booking_id as string | null)
      .filter(Boolean) as string[]
  )
  const myReviewedRideShareBookingIds = new Set(
    (myReviewedRaw ?? [])
      .map((r: Record<string, unknown>) => r.ride_share_booking_id as string | null)
      .filter(Boolean) as string[]
  )
  const myReviewedTransportOfferIds = new Set(
    (myReviewedRaw ?? [])
      .map((r: Record<string, unknown>) => r.transport_offer_id as string | null)
      .filter(Boolean) as string[]
  )

  const cabinStripeSessionIds = new Set(
    [...(guestStripeSessionsRaw ?? []), ...(hostStripeSessionsRaw ?? [])]
      .map((r) => r.stripe_session_id)
      .filter((s): s is string => Boolean(s && String(s).trim())),
  )

  function mapRideSharePassengerRow(b: Record<string, unknown>): RideShareBookingRowData | null {
    const rs = b.ride_shares as
      | {
          from_location: string
          to_location: string
          departure_at: string
          skipper_id: string
          profiles?: { full_name: string | null } | null
        }
      | null
    if (!rs) return null
    return {
      id:            b.id as string,
      status:        b.status as string,
      num_seats:     b.num_seats as number,
      total_price_ore: b.total_price_ore as number,
      created_at:    b.created_at as string,
      from_location: rs.from_location,
      to_location:   rs.to_location,
      departure_at:  rs.departure_at,
      other_name:    rs.profiles?.full_name ?? null,
      other_id:      rs.skipper_id,
      reviewee_id:   rs.skipper_id,
      isSkipperView: false,
    }
  }

  function mapRideShareSkipperRow(b: Record<string, unknown>): RideShareBookingRowData | null {
    const rs = b.ride_shares as
      | {
          from_location: string
          to_location: string
          departure_at: string
          skipper_id: string
        }
      | null
    const pr = b.profiles as { full_name: string | null } | null
    if (!rs) return null
    const passengerId = b.passenger_id as string
    return {
      id:              b.id as string,
      status:          b.status as string,
      num_seats:       b.num_seats as number,
      total_price_ore: b.total_price_ore as number,
      created_at:      b.created_at as string,
      from_location:   rs.from_location,
      to_location:     rs.to_location,
      departure_at:    rs.departure_at,
      other_name:      pr?.full_name ?? null,
      other_id:        passengerId,
      reviewee_id:     passengerId,
      isSkipperView:   true,
    }
  }

  function mapTransportGuestRow(o: Record<string, unknown>): TransportOfferBookingRowData | null {
    const tr = o.transport_requests as
      | {
          from_location: string
          to_location: string
          desired_date: string
          num_passengers: number
          guest_id: string
        }
      | null
    const skipperProfiles = o.profiles as { full_name: string | null } | null
    if (!tr) return null
    const skipperId = o.skipper_id as string
    return {
      id:             o.id as string,
      status:         o.status as string,
      price_ore:      o.price_ore as number,
      created_at:     o.created_at as string,
      from_location:  tr.from_location,
      to_location:    tr.to_location,
      desired_date:   tr.desired_date,
      num_passengers: tr.num_passengers,
      other_name:     skipperProfiles?.full_name ?? null,
      other_id:       skipperId,
      reviewee_id:    skipperId,
      isSkipperView:  false,
    }
  }

  function mapTransportSkipperRow(o: Record<string, unknown>): TransportOfferBookingRowData | null {
    const tr = o.transport_requests as
      | {
          from_location: string
          to_location: string
          desired_date: string
          num_passengers: number
          guest_id: string
          profiles?: { full_name: string | null } | null
        }
      | null
    if (!tr) return null
    const guestId = tr.guest_id
    return {
      id:             o.id as string,
      status:         o.status as string,
      price_ore:      o.price_ore as number,
      created_at:     o.created_at as string,
      from_location:  tr.from_location,
      to_location:    tr.to_location,
      desired_date:   tr.desired_date,
      num_passengers: tr.num_passengers,
      other_name:     tr.profiles?.full_name ?? null,
      other_id:       guestId,
      reviewee_id:    guestId,
      isSkipperView:  true,
    }
  }

  function mapStayOfferRow(
    row: Record<string, unknown>,
  ): StayOfferBookingRowData | null {
    const cab = row.cabins as { title: string | null } | { title: string | null }[] | null
    const cabinTitle = Array.isArray(cab) ? cab[0]?.title ?? null : cab?.title ?? null
    const sr = row.stay_requests as
      | {
          desired_check_in: string
          desired_check_out: string
          num_guests: number
        }
      | {
          desired_check_in: string
          desired_check_out: string
          num_guests: number
        }[]
      | null
    const req = Array.isArray(sr) ? sr[0] : sr
    if (!req) return null
    return {
      id:                 row.id as string,
      status:             row.status as string,
      cabin_title:        cabinTitle,
      desired_check_in:   req.desired_check_in,
      desired_check_out:  req.desired_check_out,
      num_guests:        req.num_guests,
    }
  }

  const myRideShareBookingsGuest: RideShareBookingRowData[] = (rsPassengerRaw ?? [])
    .map((b) => mapRideSharePassengerRow(b as Record<string, unknown>))
    .filter(Boolean) as RideShareBookingRowData[]

  const myRideShareBookingsSkipper: RideShareBookingRowData[] = (rsSkipperRaw ?? [])
    .map((b) => mapRideShareSkipperRow(b as Record<string, unknown>))
    .filter(Boolean) as RideShareBookingRowData[]

  const myTransportOffersGuest: TransportOfferBookingRowData[] = (toGuestRaw ?? [])
    .map((o) => mapTransportGuestRow(o as Record<string, unknown>))
    .filter(Boolean) as TransportOfferBookingRowData[]

  const myTransportOffersSkipper: TransportOfferBookingRowData[] = (toSkipperRaw ?? [])
    .map((o) => mapTransportSkipperRow(o as Record<string, unknown>))
    .filter(Boolean) as TransportOfferBookingRowData[]

  const stayOffersMerged: StayOfferBookingRowData[] = [
    ...(stayGuestOffersRaw ?? []),
    ...(stayProviderOffersRaw ?? []),
  ]
    .map((r) => mapStayOfferRow(r as Record<string, unknown>))
    .filter(Boolean) as StayOfferBookingRowData[]

  const stayOfferById = new Map(stayOffersMerged.map((s) => [s.id, s]))
  const orphanStayOfferBookings: StayOfferBookingRowData[] = [...stayOfferById.values()].filter((s) => {
    const raw = [...(stayGuestOffersRaw ?? []), ...(stayProviderOffersRaw ?? [])].find(
      (r) => (r as { id: string }).id === s.id,
    ) as { stripe_session_id?: string | null } | undefined
    const sid = raw?.stripe_session_id
    if (!sid || !String(sid).trim()) return true
    return !cabinStripeSessionIds.has(String(sid).trim())
  })

  /* ── Shape data ── */
  type CabinJoinGuest = { title?: string; owner_id?: string; price_per_night_ore?: number; property_type?: string | null; profiles?: { full_name?: string } | null } | null
  type CabinJoinHost  = { title?: string; price_per_night_ore?: number; property_type?: string | null } | null
  type GuestProfile   = { id?: string; full_name?: string; avatar_url?: string | null } | null

  const myBookings: CabinBookingData[] = (myBookingsRaw ?? []).map((b: Record<string, unknown>) => {
    const cabin = b.cabins as CabinJoinGuest
    return {
      id:                       b.id as string,
      cabin_id:                 b.cabin_id as string,
      status:                   b.status as string,
      check_in:                 b.check_in as string,
      check_out:                b.check_out as string,
      num_guests:               b.num_guests as number,
      total_price_ore:          b.total_price_ore as number,
      platform_fee_ore:         (b.platform_fee_ore as number | null) ?? null,
      stripe_payment_intent_id: (b.stripe_payment_intent_id as string | null) ?? null,
      guest_message:            b.guest_message as string | null,
      created_at:               b.created_at as string,
      cabin_title:              cabin?.title ?? null,
      cabin_price_per_night_ore: cabin?.price_per_night_ore ?? null,
      cabin_property_type:      cabin?.property_type ?? null,
      guest_name:               null,
      guest_id:                 null,
      host_name:                cabin?.profiles?.full_name ?? null,
      host_id:                  cabin?.owner_id ?? null,
      reviewee_id:              cabin?.owner_id ?? null,
    }
  })

  const hostBookings: CabinBookingData[] = (hostBookingsRaw ?? []).map((b: Record<string, unknown>) => {
    const cabin   = b.cabins as CabinJoinHost
    const guestPr = b.profiles as GuestProfile
    return {
      id:                       b.id as string,
      cabin_id:                 b.cabin_id as string,
      status:                   b.status as string,
      check_in:                 b.check_in as string,
      check_out:                b.check_out as string,
      num_guests:               b.num_guests as number,
      total_price_ore:          b.total_price_ore as number,
      platform_fee_ore:         (b.platform_fee_ore as number | null) ?? null,
      stripe_payment_intent_id: (b.stripe_payment_intent_id as string | null) ?? null,
      guest_message:            b.guest_message as string | null,
      created_at:               b.created_at as string,
      cabin_title:              cabin?.title ?? null,
      cabin_price_per_night_ore: cabin?.price_per_night_ore ?? null,
      cabin_property_type:      cabin?.property_type ?? null,
      guest_name:               guestPr?.full_name ?? null,
      guest_id:                 (b.guest_id as string | null) ?? null,
      guest_avatar_url:         guestPr?.avatar_url ?? null,
      host_name:                null,
      host_id:                  null,
      reviewee_id:              (b.guest_id as string | null) ?? null,
    }
  })

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

  const homeCity = (profileRow?.location as string | null | undefined) ?? null

  /** Prioritér bedste status når udbyder har flere tilbud på samme anmodning. */
  function pickProviderOfferStatus(
    offers: Array<{ status: string; provider_id: string }> | null | undefined,
    providerId: string,
  ): "accepted" | "pending" | "declined" | "rejected" | "expired" | null {
    const mine = (offers ?? []).filter((o) => o.provider_id === providerId)
    if (mine.length === 0) return null
    const rank = (s: string): number => {
      switch (s) {
        case "accepted":
          return 0
        case "pending":
          return 1
        case "declined":
          return 2
        case "rejected":
          return 3
        case "expired":
          return 4
        default:
          return 99
      }
    }
    let best = mine[0].status
    let bestR = rank(best)
    for (let i = 1; i < mine.length; i++) {
      const s = mine[i].status
      const r = rank(s)
      if (r < bestR) {
        bestR = r
        best = s
      }
    }
    if (bestR === 99) return null
    return best as "accepted" | "pending" | "declined" | "rejected" | "expired"
  }

  /* ── Shape cabin requests ── */
  type CabinReqGuestProfile = { id?: string; full_name?: string; avatar_url?: string | null } | null

  const myCabinRequests = (myCabinReqRaw ?? []).map((r: Record<string, unknown>) => {
    const offersRaw = r.stay_offers as Array<{ id: string; status: string }> | null | undefined
    const offers = offersRaw ?? []
    const pending_stay_offer_count = offers.filter((o) => o.status === "pending").length
    return {
      id:               r.id as string,
      location:         r.location as string,
      desired_check_in: r.desired_check_in as string,
      desired_check_out: r.desired_check_out as string,
      num_guests:       r.num_guests as number,
      max_price_ore:    (r.max_price_ore as number | null) ?? null,
      description:      (r.description as string | null) ?? null,
      status:           r.status as string,
      created_at:       r.created_at as string,
      property_type: (r.property_type as "cabin" | "residence" | "any" | null) ?? "cabin",
      pending_stay_offer_count,
      needs_transport: Boolean(r.needs_transport),
    }
  })

  const guestCabinRequests = (guestCabinReqRaw ?? []).map((r: Record<string, unknown>) => {
    const pr = r.profiles as CabinReqGuestProfile
    const offersRaw = r.stay_offers as
      | Array<{ id: string; status: string; provider_id: string }>
      | null
      | undefined
    const providerOfferStatus = pickProviderOfferStatus(offersRaw, user.id)
    return {
      id:               r.id as string,
      cabin_id:         (r.cabin_id as string | null) ?? null,
      location:         r.location as string,
      desired_check_in: r.desired_check_in as string,
      desired_check_out: r.desired_check_out as string,
      num_guests:       r.num_guests as number,
      max_price_ore:    (r.max_price_ore as number | null) ?? null,
      description:      (r.description as string | null) ?? null,
      status:           r.status as string,
      created_at:       r.created_at as string,
      property_type: (r.property_type as "cabin" | "residence" | "any" | null) ?? "cabin",
      guest_id:         pr?.id ?? null,
      guest_name:       pr?.full_name ?? null,
      guest_avatar_url: pr?.avatar_url ?? null,
      needs_transport:  Boolean(r.needs_transport),
      provider_offer_status: providerOfferStatus,
    }
  })

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
        myReviewedCabinBookingIds={[...myReviewedCabinBookingIds]}
        myReviewedRideShareBookingIds={[...myReviewedRideShareBookingIds]}
        myReviewedTransportOfferIds={[...myReviewedTransportOfferIds]}
        myRideShareBookingsGuest={myRideShareBookingsGuest}
        myRideShareBookingsSkipper={myRideShareBookingsSkipper}
        myTransportOffersGuest={myTransportOffersGuest}
        myTransportOffersSkipper={myTransportOffersSkipper}
        orphanStayOfferBookings={orphanStayOfferBookings}
        myCabins={(myCabinsRaw ?? []) as Parameters<typeof DashboardClient>[0]["myCabins"]}
        myRideShares={(myRideSharesRaw ?? []) as Parameters<typeof DashboardClient>[0]["myRideShares"]}
        myBoats={(myBoatsRaw ?? []) as BoatData[]}
        openTransportRequests={openTransportRequests}
        myTransportRequests={(myTransportReqRaw ?? []).map((r: Record<string, unknown>) => ({
          id:             r.id as string,
          from_location:  r.from_location as string,
          to_location:    r.to_location as string,
          desired_date:   r.desired_date as string,
          num_passengers: r.num_passengers as number,
          status:         r.status as string,
          offer_count:    (r.transport_offers as Array<{ count: number }> | null)?.[0]?.count ?? 0,
        }))}
        myCabinRequests={myCabinRequests}
        guestCabinRequests={guestCabinRequests}
        reviews={(reviewsRaw ?? []).map((r: Record<string, unknown>) => ({
          id:         r.id as string,
          rating:     r.rating as number,
          comment:    r.comment as string | null,
          created_at: r.created_at as string,
          profiles:   r.profiles as { full_name: string | null } | null,
        }))}
        unreadMessages={unreadCount ?? 0}
        unreadStayOfferNotifications={unreadStayOfferNotifCount}
      />
    </main>
  )
}
