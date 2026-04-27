"use server"

import { createClient } from "@/lib/supabase-server"
import { createServiceClient } from "@/lib/supabase-service"
import { getAppBaseUrl } from "@/lib/appUrl"
import { stripe } from "@/lib/stripe"

export type CreateCabinBookingInput = {
  cabin_id: string
  check_in: string
  check_out: string
  guests: number
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

export async function createCabinBooking(
  input: CreateCabinBookingInput,
): Promise<CreateCabinBookingResult> {
  if (!process.env.STRIPE_SECRET_KEY) {
    return { error: "Betaling er ikke tilgængelig lige nu" }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: "Du skal være logget ind" }
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
      "id, title, price_per_night_ore, owner_id, max_guests, published, deleted_at",
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

  const { data: owner, error: ownerErr } = await supabase
    .from("profiles")
    .select("stripe_account_id, stripe_onboarding_complete")
    .eq("id", c.owner_id)
    .maybeSingle()

  if (ownerErr || !owner) {
    return { error: "Kunne ikke hente vært" }
  }
  const o = owner as {
    stripe_account_id: string | null
    stripe_onboarding_complete: boolean
  }
  if (!o.stripe_onboarding_complete || !o.stripe_account_id) {
    return { error: "Værten modtager endnu ikke betalinger (Stripe) — prøv igen senere" }
  }

  const nights = nightCount(cIn.d, cOut.d)
  if (nights < 1) {
    return { error: "Mindst én overnatning" }
  }

  const totalPriceOre = c.price_per_night_ore * nights
  if (totalPriceOre < 1) {
    return { error: "Ugyldig pris" }
  }
  const platformFeeOre = Math.round(totalPriceOre * 0.15)

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
    })
    .select("id")
    .single()

  if (insErr || !booking) {
    console.error("[createCabinBooking] insert", insErr)
    return { error: insErr?.message || "Kunne ikke oprette booking" }
  }

  const bookingId = (booking as { id: string }).id
  const base = getAppBaseUrl()

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "dkk",
            unit_amount: totalPriceOre,
            product_data: {
              name: c.title,
            },
          },
        },
      ],
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
      cancel_url: `${base}/booking/cancelled`,
      metadata: {
        booking_id: bookingId,
        cabin_id: c.id,
      },
    })

    if (!session.url) {
      throw new Error("Manglende session-URL")
    }

    const { error: upErr } = await supabase
      .from("cabin_bookings")
      .update({
        stripe_session_id: session.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId)
      .eq("guest_id", user.id)

    if (upErr) {
      throw upErr
    }

    return { url: session.url }
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
