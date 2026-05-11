import type Stripe from "stripe"
import { headers } from "next/headers"
import { createServiceClient } from "@/lib/supabase-service"
import { stripe } from "@/lib/stripe"
import { revalidatePath } from "next/cache"
import {
  createNotification,
  notifyTransportBookingConfirmed,
  notifyRideShareBookingConfirmed,
  notifyStayOfferBookingConfirmed,
} from "@/lib/notifications"
import { calcServiceFee, calcPlatformFee } from "@/lib/money"

export const dynamic = "force-dynamic"

const isDev = process.env.NODE_ENV === "development"

function contactInfoUntilFromCheckOutYmd(checkOut: string): string {
  const d = new Date(checkOut)
  d.setDate(d.getDate() + 3)
  return d.toISOString()
}

function contactInfoUntilFromIsoTimestamp(iso: string): string {
  const d = new Date(iso)
  d.setDate(d.getDate() + 3)
  return d.toISOString()
}

function contactInfoUntilFromNow(): string {
  const d = new Date()
  d.setDate(d.getDate() + 3)
  return d.toISOString()
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    return new Response("Webhook ikke konfigureret", { status: 500 })
  }

  const raw = await request.text()
  const signature = (await headers()).get("stripe-signature")
  if (!signature) {
    return new Response("Ugyldig signatur", { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(raw, signature, secret)
  } catch (err) {
    if (isDev) {
      console.error("[stripe webhook] signaturverifikation fejlede", err)
    }
    return new Response("Ugyldig signatur", { status: 400 })
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session
    const sessionId = session.id
    const meta      = session.metadata ?? {}

    if (!sessionId) return new Response("ok", { status: 200 })

    const service = createServiceClient()

    // ── Transport booking ────────────────────────────────────────────────────
    if (meta.type === "transport") {
      const offerId   = meta.transport_offer_id
      const requestId = meta.transport_request_id

      if (!offerId || !requestId) return new Response("ok", { status: 200 })

      const transportContactUntil = contactInfoUntilFromNow()
      // Mark offer as accepted
      await service
        .from("transport_offers")
        .update({
          status: "accepted",
          updated_at: new Date().toISOString(),
          contact_info_visible_until: transportContactUntil,
        })
        .eq("id", offerId)

      // Reject all other pending offers on this request
      await service
        .from("transport_offers")
        .update({ status: "rejected", updated_at: new Date().toISOString() })
        .eq("request_id", requestId)
        .neq("id", offerId)
        .eq("status", "pending")

      // Close the request
      await service
        .from("transport_requests")
        .update({ status: "closed", updated_at: new Date().toISOString() })
        .eq("id", requestId)

      // Fetch guest_id for the confirmation message
      const { data: reqRow } = await service
        .from("transport_requests")
        .select("guest_id")
        .eq("id", requestId)
        .maybeSingle()

      // Fetch skipper_id from the accepted offer
      const { data: offerRow } = await service
        .from("transport_offers")
        .select("skipper_id")
        .eq("id", offerId)
        .maybeSingle()

      if (reqRow && offerRow) {
        const r = reqRow as { guest_id: string }
        const o = offerRow as { skipper_id: string }
        await service.from("messages").insert({
          sender_id:            o.skipper_id,
          recipient_id:         r.guest_id,
          transport_request_id: requestId,
          content:              "✅ Booking bekræftet — betaling modtaget. Transporten er aftalt!",
        })
      }

      await notifyTransportBookingConfirmed(requestId)
      revalidatePath("/dashboard")
      revalidatePath(`/transport/anmodninger/${requestId}`)
      return new Response("ok", { status: 200 })
    }

    // ── Samsejlads booking ───────────────────────────────────────────────────
    if (meta.type === "ride_share") {
      const bookingId   = meta.booking_id
      const rideShareId = meta.ride_share_id
      const seatsBooked = parseInt(meta.seats_booked ?? "0", 10)

      if (!bookingId || !rideShareId || seatsBooked < 1) {
        return new Response("ok", { status: 200 })
      }

      const pi2 = session.payment_intent
      const paymentIntentId2 =
        typeof pi2 === "string" ? pi2 : pi2 && "id" in pi2 ? (pi2 as { id: string }).id : null

      const { data: depRow } = await service
        .from("ride_shares")
        .select("departure_at")
        .eq("id", rideShareId)
        .maybeSingle()
      const depAt = (depRow as { departure_at: string } | null)?.departure_at
      const rideShareContactUntil = depAt
        ? contactInfoUntilFromIsoTimestamp(depAt)
        : contactInfoUntilFromNow()

      // Confirm the booking
      await service
        .from("ride_share_bookings")
        .update({
          status: "confirmed",
          stripe_payment_intent_id: paymentIntentId2 ?? undefined,
          updated_at: new Date().toISOString(),
          contact_info_visible_until: rideShareContactUntil,
        })
        .eq("id", bookingId)
        .eq("status", "pending")

      // Atomically decrement seats; if 0 remaining, mark as full
      const { data: rsRow } = await service
        .from("ride_shares")
        .select("seats_available")
        .eq("id", rideShareId)
        .maybeSingle()

      if (rsRow) {
        const r = rsRow as { seats_available: number }
        const newSeats = Math.max(0, r.seats_available - seatsBooked)
        await service
          .from("ride_shares")
          .update({
            seats_available: newSeats,
            status: newSeats === 0 ? "full" : "active",
            updated_at: new Date().toISOString(),
          })
          .eq("id", rideShareId)
      }

      await notifyRideShareBookingConfirmed(bookingId)
      revalidatePath("/transport")
      revalidatePath(`/transport/${rideShareId}`)
      revalidatePath("/dashboard")
      return new Response("ok", { status: 200 })
    }

    // ── Stay offer → cabin booking (gæst accepterer tilbud) ───────────────
    if (meta.type === "stay_offer") {
      const stayOfferId   = meta.stay_offer_id
      const stayRequestId = meta.stay_request_id
      const cabinIdMeta   = meta.cabin_id
      const guestIdMeta   = meta.guest_id

      if (!stayOfferId || !stayRequestId || !cabinIdMeta || !guestIdMeta) {
        return new Response("ok", { status: 200 })
      }

      const { data: existingBySession } = await service
        .from("cabin_bookings")
        .select("id")
        .eq("stripe_session_id", sessionId)
        .maybeSingle()

      if (existingBySession) {
        return new Response("ok", { status: 200 })
      }

      const piSo = session.payment_intent
      const paymentIntentIdSo =
        typeof piSo === "string"
          ? piSo
          : piSo && "id" in piSo
            ? (piSo as { id: string }).id
            : null

      if (!paymentIntentIdSo) {
        if (isDev) console.error("[stripe webhook] stay_offer mangler payment_intent", sessionId)
        return new Response("ok", { status: 200 })
      }

      const { data: offerRow, error: offerErr } = await service
        .from("stay_offers")
        .select(`
          id,
          status,
          offered_price_ore,
          transport_price_ore,
          cabin_id,
          stay_request_id,
          provider_id,
          cabins ( title ),
          stay_requests (
            guest_id,
            status,
            desired_check_in,
            desired_check_out,
            num_guests
          )
        `)
        .eq("id", stayOfferId)
        .maybeSingle()

      if (offerErr || !offerRow) {
        if (isDev) console.error("[stripe webhook] stay_offer find", offerErr)
        return new Response("DB-fejl", { status: 500 })
      }

      const offerRaw = offerRow as {
        id: string
        status: string
        offered_price_ore: number
        transport_price_ore: number
        cabin_id: string
        stay_request_id: string
        provider_id: string
        cabins: { title: string | null } | { title: string | null }[] | null
        stay_requests:
          | {
              guest_id: string
              status: string
              desired_check_in: string
              desired_check_out: string
              num_guests: number
            }
          | {
              guest_id: string
              status: string
              desired_check_in: string
              desired_check_out: string
              num_guests: number
            }[]
          | null
      }

      const srRawNest = offerRaw.stay_requests
      const sr = (Array.isArray(srRawNest) ? srRawNest[0] : srRawNest) as
        | {
            guest_id: string
            status: string
            desired_check_in: string
            desired_check_out: string
            num_guests: number
          }
        | null
        | undefined

      const cabinsNest = offerRaw.cabins
      const cabinRow   = (Array.isArray(cabinsNest) ? cabinsNest[0] : cabinsNest) as
        | { title: string | null }
        | null
        | undefined
      const cabinTitle = cabinRow?.title?.trim() || "Ophold"

      const offer = {
        id:                 offerRaw.id,
        status:             offerRaw.status,
        offered_price_ore:  offerRaw.offered_price_ore,
        transport_price_ore: Math.max(0, Number(offerRaw.transport_price_ore) || 0),
        cabin_id:           offerRaw.cabin_id,
        stay_request_id:    offerRaw.stay_request_id,
        provider_id:        offerRaw.provider_id,
      }

      if (!sr || sr.guest_id !== guestIdMeta || offer.cabin_id !== cabinIdMeta) {
        return new Response("ok", { status: 200 })
      }

      if (String(stayRequestId) !== String(offer.stay_request_id)) {
        return new Response("ok", { status: 200 })
      }

      if (offer.status === "accepted") {
        return new Response("ok", { status: 200 })
      }

      if (offer.status !== "pending") {
        return new Response("ok", { status: 200 })
      }

      if (sr.status !== "open") {
        return new Response("ok", { status: 200 })
      }

      const stayOre = offer.offered_price_ore
      const transportOre = offer.transport_price_ore
      const subtotalOre = stayOre + transportOre

      const platformFeeOre = calcPlatformFee(subtotalOre)
      const serviceFeeOre  = calcServiceFee(subtotalOre)
      const stayOfferContactUntil = contactInfoUntilFromCheckOutYmd(sr.desired_check_out)

      const { data: inserted, error: bookErr } = await service
        .from("cabin_bookings")
        .insert({
          cabin_id:                 offer.cabin_id,
          guest_id:                 sr.guest_id,
          check_in:                 sr.desired_check_in,
          check_out:                sr.desired_check_out,
          num_guests:               sr.num_guests,
          total_price_ore:          subtotalOre,
          platform_fee_ore:         platformFeeOre,
          service_fee_ore:          serviceFeeOre,
          status:                   "confirmed",
          stripe_session_id:        sessionId,
          stripe_payment_intent_id: paymentIntentIdSo,
          includes_transport:       transportOre > 0,
          transport_total_ore:      transportOre,
          contact_info_visible_until: stayOfferContactUntil,
        })
        .select("id")
        .maybeSingle()

      if (bookErr || !inserted) {
        if (isDev) console.error("[stripe webhook] stay_offer cabin_bookings insert", bookErr)
        return new Response("Booking fejlede", { status: 500 })
      }

      const bookingIdNew = (inserted as { id: string }).id
      await createNotification(offer.provider_id, "booking_confirmed", bookingIdNew)

      const { error: upOfferErr } = await service
        .from("stay_offers")
        .update({
          status:                   "accepted",
          stripe_session_id:        sessionId,
          stripe_payment_intent_id: paymentIntentIdSo,
          updated_at:               new Date().toISOString(),
        })
        .eq("id", stayOfferId)
        .eq("status", "pending")

      if (upOfferErr) {
        if (isDev) console.error("[stripe webhook] stay_offer accept update", upOfferErr)
        return new Response("Opdatering fejlede", { status: 500 })
      }

      const { error: reqErr } = await service
        .from("stay_requests")
        .update({
          status:     "matched",
          cabin_id:   offer.cabin_id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", offer.stay_request_id)
        .eq("status", "open")

      if (reqErr) {
        if (isDev) console.error("[stripe webhook] stay_request matched", reqErr)
        return new Response("Anmodning fejlede", { status: 500 })
      }

      await service
        .from("stay_offers")
        .update({ status: "rejected", updated_at: new Date().toISOString() })
        .eq("stay_request_id", offer.stay_request_id)
        .neq("id", stayOfferId)
        .eq("status", "pending")

      const { data: profRows } = await service
        .from("profiles")
        .select("id, full_name")
        .in("id", [sr.guest_id, offer.provider_id])

      const nameMap = new Map(
        (profRows ?? []).map((p: { id: string; full_name: string | null }) => [
          p.id,
          typeof p.full_name === "string" ? p.full_name.trim() : "",
        ]),
      )
      const guestName    = nameMap.get(sr.guest_id) || "Gæst"
      const providerName = nameMap.get(offer.provider_id) || "Udbyder"

      try {
        await notifyStayOfferBookingConfirmed({
          stayOfferId:   stayOfferId,
          cabinTitle,
          checkIn:       sr.desired_check_in,
          checkOut:      sr.desired_check_out,
          guestId:       sr.guest_id,
          providerId:    offer.provider_id,
          guestName,
          providerName,
        })
      } catch (e) {
        if (isDev) console.error("[stripe webhook] notify stay_offer", e)
      }

      revalidatePath("/")
      revalidatePath("/dashboard")
      revalidatePath(`/dashboard/mine-oensker/${offer.stay_request_id}`)
      return new Response("ok", { status: 200 })
    }

    // ── Cabin booking (existing logic) ──────────────────────────────────────
    const pi = session.payment_intent
    const paymentIntentId =
      typeof pi === "string" ? pi : pi && "id" in pi ? (pi as { id: string }).id : null

    const { data: row, error: findErr } = await service
      .from("cabin_bookings")
      .select("id, status, stripe_payment_intent_id, deleted_at, check_out")
      .eq("stripe_session_id", sessionId)
      .maybeSingle()

    if (findErr) {
      if (isDev) console.error("[stripe webhook] find booking", findErr)
      return new Response("DB-fejl", { status: 500 })
    }

    if (!row || (row as { deleted_at: string | null }).deleted_at) {
      return new Response("ok", { status: 200 })
    }

    const b = row as {
      id: string
      status: string
      stripe_payment_intent_id: string | null
      check_out: string
    }
    if (b.status === "confirmed" && b.stripe_payment_intent_id) {
      return new Response("ok", { status: 200 })
    }

    if (!paymentIntentId) {
      if (isDev) console.error("[stripe webhook] mangler payment_intent", sessionId)
      return new Response("ok", { status: 200 })
    }

    const cabinContactUntil = contactInfoUntilFromCheckOutYmd(b.check_out)

    const { error: upErr } = await service
      .from("cabin_bookings")
      .update({
        status: "confirmed",
        stripe_payment_intent_id: paymentIntentId,
        updated_at: new Date().toISOString(),
        contact_info_visible_until: cabinContactUntil,
      })
      .eq("id", b.id)
      .is("deleted_at", null)

    if (upErr) {
      if (isDev) console.error("[stripe webhook] update", upErr)
      return new Response("Opdatering fejlede", { status: 500 })
    }

    const { data: cabinBookingHost } = await service
      .from("cabin_bookings")
      .select("id, cabin_id, cabins!inner(owner_id)")
      .eq("id", b.id)
      .maybeSingle()
    const ownerRow = cabinBookingHost as
      | { id: string; cabin_id: string; cabins: { owner_id: string } | { owner_id: string }[] }
      | null
    const ownerNest = ownerRow?.cabins
    const ownerId =
      ownerNest && !Array.isArray(ownerNest)
        ? ownerNest.owner_id
        : Array.isArray(ownerNest)
          ? ownerNest[0]?.owner_id
          : null
    if (ownerId) {
      await createNotification(ownerId, "booking_confirmed", b.id)
    }

    revalidatePath("/")
    revalidatePath("/profil")
    revalidatePath("/dashboard")
  }

  return new Response("ok", { status: 200 })
}
