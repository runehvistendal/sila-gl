"use server"

import { requireSession } from "@/lib/requireSession"
import { createServiceClient } from "@/lib/supabase-service"
import { enumerateNights } from "@/lib/cabinBookingDates"
import { getAppBaseUrl } from "@/lib/appUrl"
import { stripe } from "@/lib/stripe"

export type TransportTrip = "none" | "round_trip" | "outbound" | "return"

export type CreateCabinBookingInput = {
  cabin_id: string
  check_in: string
  check_out: string
  guests: number
  /** Kun relevant hvis hytten tilbyder transport */
  transport_trip?: TransportTrip
}

export type CreateCabinBookingResult = { url: string } | { error: string }

function parseYmd(s: string): { ok: true; d: string } | { ok: false } {
  const t = s.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return { ok: false }
  const [y, m, d] = t.split("-").map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    return { ok: false }
  }
  return { ok: true, d: t }
}

function nightCount(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn + "T12:00:00.000Z").getTime()
  const b = new Date(checkOut + "T12:00:00.000Z").getTime()
  return Math.max(0, Math.round((b - a) / 86_400_000))
}

function transportOreForTrip(
  trip: TransportTrip,
  perPersonOre: number,
  guests: number,
): number {
  if (trip === "none" || perPersonOre <= 0) return 0
  if (trip === "round_trip") return perPersonOre * guests * 2
  if (trip === "outbound" || trip === "return") {
    return perPersonOre * guests
  }
  return 0
}

function stripeIdempotencyKey(
  userId: string,
  cabinId: string,
  checkIn: string,
  checkOut: string,
): string {
  const raw = `booking-${userId}-${cabinId}-${checkIn}-${checkOut}`
  return raw.replace(/[^a-zA-Z0-9\-_.]/g, "-").slice(0, 255)
}

export async function createCabinBooking(
  input: CreateCabinBookingInput,
): Promise<CreateCabinBookingResult> {
  if (!process.env.STRIPE_SECRET_KEY) {
    return { error: "Betaling er ikke tilgængelig lige nu" }
  }

  const { supabase, user } = await requireSession()

  const { error: rlErr } = await supabase.rpc("consume_rate_limit", {
    p_user_id: user.id,
    p_action: "create_cabin_booking",
    p_max_attempts: 5,
    p_window_seconds: 600,
  })

  if (rlErr) {
    const code = String((rlErr as { code?: string }).code ?? "")
    const msg = (rlErr.message ?? "").toLowerCase()
    const details = String((rlErr as { details?: string }).details ?? "").toLowerCase()
    if (
      code === "P0001" ||
      msg.includes("rate_limit") ||
      details.includes("rate_limit") ||
      msg.includes("p0001")
    ) {
      throw new Error("For mange forsøg — prøv igen senere")
    }
    return { error: rlErr.message || "Kunne ikke verificere rate limit" }
  }

  const cIn = parseYmd(input.check_in)
  const cOut = parseYmd(input.check_out)
  if (!cIn.ok || !cOut.ok) {
    return { error: "Ugyldige datoer" }
  }
  if (cOut.d <= cIn.d) {
    return { error: "Udtjek skal være efter indtjek" }
  }

  const today = new Date().toISOString().slice(0, 10)
  if (cIn.d < today) {
    return { error: "Indtjek kan ikke være i fortiden" }
  }

  const guests = Math.floor(Number(input.guests))
  if (!Number.isFinite(guests) || guests < 1) {
    return { error: "Vælg mindst 1 gæst" }
  }

  const { data: cabin, error: cabinErr } = await supabase
    .from("cabins")
    .select(
      "id, title, price_per_night_ore, owner_id, max_guests, published, deleted_at, offers_transport, transport_price_per_person_ore, min_nights, preparation_days",
    )
    .eq("id", input.cabin_id)
    .maybeSingle()

  if (cabinErr || !cabin) {
    return { error: "Hytte findes ikke" }
  }

  const c = cabin as {
    id: string
    title: string
    price_per_night_ore: number
    owner_id: string
    max_guests: number
    published: boolean
    deleted_at: string | null
    offers_transport: boolean
    transport_price_per_person_ore: number | null
    min_nights: number
    preparation_days: number
  }
  if (!c.published || c.deleted_at) {
    return { error: "Hytte er ikke tilgængelig" }
  }
  if (c.owner_id === user.id) {
    return { error: "Du kan ikke booke din egen hytte" }
  }
  if (guests > c.max_guests) {
    return { error: `Højst ${c.max_guests} gæster` }
  }

  let trip: TransportTrip = input.transport_trip ?? "none"
  const allowed: TransportTrip[] = ["none", "round_trip", "outbound", "return"]
  if (!allowed.includes(trip)) trip = "none"
  if (!c.offers_transport) {
    trip = "none"
  }

  const perPerson = c.transport_price_per_person_ore ?? 0
  const transportTotalOre = transportOreForTrip(trip, perPerson, guests)
  if (c.offers_transport && trip !== "none" && perPerson <= 0) {
    return { error: "Transportpris er ikke angivet for denne hytte" }
  }

  const { data: ownerRows, error: ownerErr } = await supabase.rpc(
    "get_owner_stripe_info",
    { p_cabin_id: c.id },
  )

  if (ownerErr || !ownerRows || (ownerRows as unknown[]).length === 0) {
    return { error: "Kunne ikke hente vært" }
  }
  const o = (ownerRows as Array<{
    stripe_account_id: string | null
    stripe_onboarding_complete: boolean
  }>)[0]
  if (!o.stripe_onboarding_complete || !o.stripe_account_id) {
    return { error: "Værten modtager endnu ikke betalinger (Stripe) — prøv igen senere" }
  }

  const nights = nightCount(cIn.d, cOut.d)
  if (nights < 1) {
    return { error: "Mindst én overnatning" }
  }
  const minNights = c.min_nights ?? 1
  if (nights < minNights) {
    return {
      error: `Minimum ${minNights} ${minNights === 1 ? "nat" : "nætter"} kræves for denne hytte`,
    }
  }

  const cabinStayOre = c.price_per_night_ore * nights
  if (cabinStayOre < 1) {
    return { error: "Ugyldig pris" }
  }
  const totalPriceOre = cabinStayOre + transportTotalOre
  const platformFeeOre = Math.round(totalPriceOre * 0.15)

  const requestedNights = enumerateNights(cIn.d, cOut.d)
  if (requestedNights.length > 0) {
    const { data: manualHits } = await supabase
      .from("cabin_availability")
      .select("id")
      .eq("cabin_id", c.id)
      .eq("is_available", false)
      .is("deleted_at", null)
      .in("date", requestedNights)
      .limit(1)
    if (manualHits && manualHits.length > 0) {
      return { error: "Hytte er ikke ledig (vært har blokeret datoer)" }
    }
  }

  const { data: overlap } = await supabase
    .from("cabin_bookings")
    .select("id")
    .eq("cabin_id", c.id)
    .in("status", ["pending", "confirmed", "completed"])
    .is("deleted_at", null)
    .lt("check_in", cOut.d)
    .gt("check_out", cIn.d)
    .limit(1)
    .maybeSingle()

  if (overlap) {
    return { error: "Hytte er allerede reserveret i denne periode" }
  }

  // Forberedelsestid: tjek at check_in ikke falder inden for preparation_days dage efter en eksisterende bookings check_out
  const prepDays = c.preparation_days ?? 0
  if (prepDays > 0) {
    // Find bookings where check_out + preparation_days overlaps with requested check_in
    const { data: prepRows } = await supabase
      .from("cabin_bookings")
      .select("check_out")
      .eq("cabin_id", c.id)
      .in("status", ["pending", "confirmed", "completed"])
      .is("deleted_at", null)
      .lte("check_out", cIn.d) // booking ends before or on requested check_in
      .gt("check_out", (() => {
        const d = new Date(cIn.d + "T12:00:00.000Z")
        d.setUTCDate(d.getUTCDate() - prepDays)
        return d.toISOString().slice(0, 10)
      })()) // but ends within prepDays before requested check_in

    if (prepRows && prepRows.length > 0) {
      return {
        error: `Hytten kræver ${prepDays} dages forberedelsestid efter en booking`,
      }
    }

    // Also check that our check_out + prepDays doesn't overlap with next booking's check_in
    const prepCheckOutDate = (() => {
      const d = new Date(cOut.d + "T12:00:00.000Z")
      d.setUTCDate(d.getUTCDate() + prepDays)
      return d.toISOString().slice(0, 10)
    })()
    const { data: nextRows } = await supabase
      .from("cabin_bookings")
      .select("check_in")
      .eq("cabin_id", c.id)
      .in("status", ["pending", "confirmed", "completed"])
      .is("deleted_at", null)
      .gte("check_in", cOut.d)
      .lt("check_in", prepCheckOutDate)
      .limit(1)

    if (nextRows && nextRows.length > 0) {
      return {
        error: `Hytten kræver ${prepDays} dages forberedelsestid efter en booking`,
      }
    }
  }

  const { data: booking, error: insErr } = await supabase
    .from("cabin_bookings")
    .insert({
      cabin_id: c.id,
      guest_id: user.id,
      check_in: cIn.d,
      check_out: cOut.d,
      num_guests: guests,
      total_price_ore: totalPriceOre,
      platform_fee_ore: platformFeeOre,
      status: "pending",
      includes_transport: transportTotalOre > 0,
      transport_total_ore: transportTotalOre,
    })
    .select("id")
    .single()

  if (insErr || !booking) {
    console.error("[createCabinBooking] insert", insErr)
    return { error: insErr?.message || "Kunne ikke oprette booking" }
  }

  const bookingId = (booking as { id: string }).id
  const base = getAppBaseUrl()
  const idempotencyKey = stripeIdempotencyKey(
    user.id,
    c.id,
    cIn.d,
    cOut.d,
  )

  const lineItems: Array<{
    quantity: number
    price_data: {
      currency: "dkk"
      unit_amount: number
      product_data: { name: string; description?: string }
    }
  }> = [
    {
      quantity: 1,
      price_data: {
        currency: "dkk",
        unit_amount: cabinStayOre,
        product_data: { name: `${c.title} — overnatning` },
      },
    },
  ]
  if (transportTotalOre > 0) {
    const label =
      trip === "round_trip"
        ? "Transport (tur-retur)"
        : trip === "outbound"
          ? "Transport (udrejse)"
          : "Transport (hjemrejse)"
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: "dkk",
        unit_amount: transportTotalOre,
        product_data: { name: label },
      },
    })
  }

  try {
    const sessionCheckout = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        payment_method_types: ["card"],
        line_items: lineItems,
        payment_intent_data: {
          application_fee_amount: platformFeeOre,
          transfer_data: {
            destination: o.stripe_account_id,
          },
          metadata: {
            booking_id: bookingId,
            cabin_id: c.id,
          },
        },
        success_url: `${base}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${base}/booking/cancelled?booking_id=${bookingId}&cabin_id=${c.id}&check_in=${encodeURIComponent(cIn.d)}&check_out=${encodeURIComponent(cOut.d)}`,
        metadata: {
          booking_id: bookingId,
          cabin_id: c.id,
        },
      },
      { idempotencyKey },
    )

    if (!sessionCheckout.url) {
      throw new Error("Manglende session-URL")
    }

    const { error: upErr } = await supabase
      .from("cabin_bookings")
      .update({
        stripe_session_id: sessionCheckout.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId)
      .eq("guest_id", user.id)

    if (upErr) {
      throw upErr
    }

    return { url: sessionCheckout.url }
  } catch (e) {
    console.error("[createCabinBooking] stripe", e)
    const service = createServiceClient()
    await service.from("cabin_bookings").delete().eq("id", bookingId)
    return {
      error:
        e instanceof Error
          ? e.message
          : "Betalingen kunne ikke startes. Prøv igen.",
    }
  }
}

export type CancelPendingBookingResult =
  | { cabin_id: string; check_in: string; check_out: string }
  | { error: string }

export async function cancelPendingBooking(
  bookingId: string,
): Promise<CancelPendingBookingResult> {
  if (!bookingId) return { error: "Manglende booking-id" }

  const { supabase, user } = await requireSession()

  const { data: row, error: fetchErr } = await supabase
    .from("cabin_bookings")
    .select("id, status, guest_id, cabin_id, check_in, check_out, stripe_session_id")
    .eq("id", bookingId)
    .maybeSingle()

  if (fetchErr || !row) return { error: "Booking ikke fundet" }

  const b = row as {
    id: string
    status: string
    guest_id: string
    cabin_id: string
    check_in: string
    check_out: string
    stripe_session_id: string | null
  }

  if (b.guest_id !== user.id) return { error: "Ikke autoriseret" }
  if (b.status !== "pending") return { error: "Kun ventende bookinger kan annulleres" }

  if (b.stripe_session_id) {
    try {
      await stripe.checkout.sessions.expire(b.stripe_session_id)
    } catch {
      /* Sessionen kan allerede være udløbet — fortsæt */
    }
  }

  const service = createServiceClient()
  const { error: upErr } = await service
    .from("cabin_bookings")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancellation_reason: "guest_cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId)
    .eq("guest_id", user.id)
    .eq("status", "pending")

  if (upErr) return { error: "Kunne ikke annullere booking" }

  return {
    cabin_id: b.cabin_id,
    check_in: b.check_in,
    check_out: b.check_out,
  }
}
