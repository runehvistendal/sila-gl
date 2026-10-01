"use server"

import { revalidatePath } from "next/cache"
import { requireSession } from "@/lib/requireSession"
import { createServiceClient } from "@/lib/supabase-service"
import { refundPaymentIntent, stripe } from "@/lib/stripe"
import {
  notifyRideShareBookingCancelledByPassenger,
  notifyRideShareCancelledBySkipper,
} from "@/lib/notifications"
import { passengerGetsFullRefund, type RideShareCancelReason } from "@/lib/rideSharePolicy"

type BookingRow = {
  id: string
  passenger_id: string
  status: string
  num_seats: number
  total_price_ore: number
  service_fee_ore: number
  stripe_payment_intent_id: string | null
  stripe_session_id: string | null
}

export type CancelResult = { ok: true; refundedCount: number; failedRefunds: number } | { error: string }

/**
 * Sejleren aflyser hele turen (fx vejr/is). Alle bekræftede passagerer
 * refunderes fuldt; igangværende checkouts lukkes. Kører med service client,
 * fordi refusion + statusændring ikke må kunne udføres direkte fra klienten
 * (se ride_shares_guard_update).
 */
export async function cancelRideShare(
  rideShareId: string,
  reason: RideShareCancelReason,
): Promise<CancelResult> {
  const { supabase, user } = await requireSession()

  const { data: rs } = await supabase
    .from("ride_shares")
    .select("id, skipper_id, status, departure_at, return_ride_share_id")
    .eq("id", rideShareId)
    .maybeSingle()

  if (!rs || (rs as { skipper_id: string }).skipper_id !== user.id) {
    return { error: "Turen blev ikke fundet" }
  }
  const ride = rs as { id: string; status: string; departure_at: string }
  if (!["active", "full"].includes(ride.status)) {
    return { error: "Turen kan ikke aflyses i sin nuværende status" }
  }

  const service = createServiceClient()
  const { data: rows, error: rowsErr } = await service
    .from("ride_share_bookings")
    .select("id, passenger_id, status, num_seats, total_price_ore, service_fee_ore, stripe_payment_intent_id, stripe_session_id")
    .eq("ride_share_id", rideShareId)
    .in("status", ["pending", "confirmed"])
  if (rowsErr) return { error: "Kunne ikke hente bookinger" }

  const bookings = (rows ?? []) as BookingRow[]
  const refunded: Array<{ passengerId: string; refundedOre: number }> = []
  let failed = 0
  const nowIso = new Date().toISOString()

  for (const b of bookings) {
    if (b.status === "pending") {
      // Luk checkout-sessionen, så ingen kan betale for en aflyst tur
      if (b.stripe_session_id) {
        await stripe.checkout.sessions.expire(b.stripe_session_id).catch(() => undefined)
      }
      await service
        .from("ride_share_bookings")
        .update({ status: "cancelled", cancelled_at: nowIso, cancellation_reason: reason, updated_at: nowIso })
        .eq("id", b.id)
        .eq("status", "pending")
      continue
    }

    // confirmed → fuld refusion
    let refundedOre = 0
    if (b.stripe_payment_intent_id) {
      const r = await refundPaymentIntent(b.stripe_payment_intent_id, {
        idempotencyKey: `ride_share_cancel_${b.id}`,
      })
      if (r.ok) {
        refundedOre = r.amountOre
      } else {
        failed++
        console.error("[cancelRideShare] refund fejlede", b.id, r.error)
        continue // behold bookingen bekræftet, så fejlen er synlig og kan gentages
      }
    }
    await service
      .from("ride_share_bookings")
      .update({
        status: "cancelled",
        cancelled_at: nowIso,
        cancellation_reason: reason,
        refunded_amount_ore: refundedOre,
        updated_at: nowIso,
      })
      .eq("id", b.id)
    refunded.push({ passengerId: b.passenger_id, refundedOre })
  }

  if (failed > 0) {
    return { error: `${failed} refusion(er) fejlede. Prøv igen — de øvrige er refunderet.` }
  }

  await service
    .from("ride_shares")
    .update({ status: "cancelled", cancelled_at: nowIso, cancellation_reason: reason, updated_at: nowIso })
    .eq("id", rideShareId)

  if (refunded.length > 0) {
    await notifyRideShareCancelledBySkipper(rideShareId, refunded, reason)
  }

  revalidatePath("/transport")
  revalidatePath(`/transport/${rideShareId}`)
  revalidatePath("/dashboard")
  return { ok: true, refundedCount: refunded.length, failedRefunds: 0 }
}

/**
 * Passageren afbestiller sin bekræftede plads.
 * ≥ 48 t før afgang: fuld refusion. Derefter: ingen refusion, men pladsen frigives.
 */
export async function cancelMyRideShareBooking(
  bookingId: string,
): Promise<{ ok: true; refundedOre: number } | { error: string }> {
  const { supabase, user } = await requireSession()

  const { data } = await supabase
    .from("ride_share_bookings")
    .select("id, passenger_id, status, num_seats, ride_share_id, stripe_payment_intent_id, ride_shares!inner(departure_at)")
    .eq("id", bookingId)
    .maybeSingle()

  const b = data as
    | {
        id: string; passenger_id: string; status: string; num_seats: number
        ride_share_id: string; stripe_payment_intent_id: string | null
        ride_shares: { departure_at: string } | { departure_at: string }[]
      }
    | null

  if (!b || b.passenger_id !== user.id) return { error: "Booking ikke fundet" }
  if (b.status !== "confirmed") return { error: "Kun bekræftede bookinger kan afbestilles" }

  const departureAt = Array.isArray(b.ride_shares) ? b.ride_shares[0]?.departure_at : b.ride_shares.departure_at
  if (!departureAt || new Date(departureAt).getTime() <= Date.now()) {
    return { error: "Turen er allerede sejlet" }
  }

  let refundedOre = 0
  if (passengerGetsFullRefund(departureAt) && b.stripe_payment_intent_id) {
    const r = await refundPaymentIntent(b.stripe_payment_intent_id, {
      idempotencyKey: `ride_share_passenger_cancel_${b.id}`,
    })
    if (!r.ok) return { error: "Refusionen kunne ikke gennemføres. Prøv igen om lidt." }
    refundedOre = r.amountOre
  }

  const nowIso = new Date().toISOString()
  const service = createServiceClient()
  const { error: upErr } = await service
    .from("ride_share_bookings")
    .update({
      status: "cancelled",
      cancelled_at: nowIso,
      cancellation_reason: "passenger_cancelled",
      refunded_amount_ore: refundedOre,
      updated_at: nowIso,
    })
    .eq("id", b.id)
    .eq("status", "confirmed")
  if (upErr) return { error: "Afbestillingen kunne ikke gemmes" }

  await notifyRideShareBookingCancelledByPassenger(b.ride_share_id, user.id, b.num_seats)

  revalidatePath(`/transport/${b.ride_share_id}`)
  revalidatePath("/dashboard")
  return { ok: true, refundedOre }
}
