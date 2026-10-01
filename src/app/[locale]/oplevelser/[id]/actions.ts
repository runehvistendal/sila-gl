"use server"

import { createServiceClient } from "@/lib/supabase-service"
import { createClient } from "@/lib/supabase-server"
import { calcPlatformFee, calcServiceFee } from "@/lib/money"
import { getAppBaseUrl } from "@/lib/appUrl"
import { stripe } from "@/lib/stripe"

export type CreateExperienceBookingResult = { url: string } | { error: string }

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

export async function createExperienceBooking(input: {
  experience_id: string
  date: string
  num_participants: number
}): Promise<CreateExperienceBookingResult> {
  if (!process.env.STRIPE_SECRET_KEY) {
    return { error: "Betaling er ikke tilgængelig lige nu" }
  }

  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) {
    return { error: "Ikke logget ind" }
  }
  const user = session.user

  const { error: rlErr } = await supabase.rpc("consume_rate_limit", {
    p_user_id: user.id,
    p_action: "create_experience_booking",
    p_max_attempts: 5,
    p_window_seconds: 600,
  })

  if (rlErr) {
    const code = String((rlErr as { code?: string }).code ?? "")
    const msg = (rlErr.message ?? "").toLowerCase()
    if (code === "P0001" || msg.includes("rate_limit") || msg.includes("p0001")) {
      return { error: "For mange forsøg — prøv igen senere" }
    }
    return { error: rlErr.message || "Kunne ikke verificere rate limit" }
  }

  const dateParsed = parseYmd(input.date)
  if (!dateParsed.ok) {
    return { error: "Ugyldig dato" }
  }
  const dateYmd = dateParsed.d

  const today = new Date().toISOString().slice(0, 10)
  if (dateYmd < today) {
    return { error: "Datoen kan ikke være i fortiden" }
  }

  const numParticipants = Math.floor(Number(input.num_participants))
  if (!Number.isFinite(numParticipants) || numParticipants < 1) {
    return { error: "Vælg mindst én deltager" }
  }

  const { data: ex, error: exErr } = await supabase
    .from("experiences")
    .select(
      "id, title, provider_id, price_per_person_ore, max_participants, published, deleted_at, preparation_days",
    )
    .eq("id", input.experience_id)
    .maybeSingle()

  if (exErr || !ex) {
    return { error: "Oplevelsen findes ikke" }
  }

  const exp = ex as {
    id: string
    title: string
    provider_id: string
    price_per_person_ore: number
    max_participants: number
    published: boolean
    deleted_at: string | null
    preparation_days: number | null
  }

  if (!exp.published || exp.deleted_at) {
    return { error: "Oplevelsen er ikke tilgængelig" }
  }
  if (exp.provider_id === user.id) {
    return { error: "Du kan ikke booke din egen oplevelse" }
  }
  if (numParticipants > exp.max_participants) {
    return { error: `Højst ${exp.max_participants} deltagere` }
  }

  const { data: blockedRow } = await supabase
    .from("experience_availability")
    .select("id")
    .eq("experience_id", exp.id)
    .eq("date", dateYmd)
    .eq("is_available", false)
    .maybeSingle()

  if (blockedRow) {
    return { error: "Den valgte dato er ikke tilgængelig" }
  }

  const prepDays = exp.preparation_days ?? 0

  function addDaysYmd(ymd: string, days: number): string {
    const d = new Date(ymd + "T12:00:00.000Z")
    d.setUTCDate(d.getUTCDate() + days)
    return d.toISOString().slice(0, 10)
  }

  if (prepDays > 0) {
    const { data: priorBookings } = await supabase
      .from("experience_bookings")
      .select("date")
      .eq("experience_id", exp.id)
      .in("status", ["pending", "confirmed"])

    for (const row of priorBookings ?? []) {
      const h = String((row as { date: string }).date).slice(0, 10)
      const prepEnd = addDaysYmd(h, prepDays)
      if (dateYmd > h && dateYmd <= prepEnd) {
        return {
          error:
            "Den valgte dato ligger i udbyderens forberedelsesperiode efter en anden booking — vælg en anden dag",
        }
      }
    }
  }

  const { data: occRows } = await supabase
    .from("experience_bookings")
    .select("num_participants")
    .eq("experience_id", exp.id)
    .eq("date", dateYmd)
    .in("status", ["pending", "confirmed"])

  const used = (occRows ?? []).reduce(
    (acc, r) => acc + Math.max(0, Number((r as { num_participants: number }).num_participants)),
    0,
  )
  if (used + numParticipants > exp.max_participants) {
    return { error: "Ikke nok ledige pladser på denne dato" }
  }

  const { data: dupPending } = await supabase
    .from("experience_bookings")
    .select("id")
    .eq("experience_id", exp.id)
    .eq("guest_id", user.id)
    .eq("date", dateYmd)
    .eq("status", "pending")
    .maybeSingle()

  if (dupPending) {
    return { error: "Du har allerede en afventende booking på denne dato" }
  }

  const { data: stripeRows, error: stripeRpcErr } = await supabase.rpc(
    "get_experience_provider_stripe",
    { p_experience_id: exp.id },
  )

  if (stripeRpcErr || !stripeRows || (stripeRows as unknown[]).length === 0) {
    return { error: "Kunne ikke hente udbyder" }
  }
  const stripeInfo = (stripeRows as Array<{
    stripe_account_id: string | null
    stripe_onboarding_complete: boolean
  }>)[0]
  if (!stripeInfo.stripe_onboarding_complete || !stripeInfo.stripe_account_id) {
    return {
      error:
        "Udbyderen modtager ikke betalinger endnu — prøv igen senere eller vælg en anden oplevelse",
    }
  }

  const totalPriceOre = exp.price_per_person_ore * numParticipants
  if (totalPriceOre < 1) {
    return { error: "Ugyldig pris" }
  }

  const serviceFeeOre = calcServiceFee(totalPriceOre)
  const platformFeeOre = calcPlatformFee(totalPriceOre)
  const applicationFeeAmount = platformFeeOre + serviceFeeOre

  const { data: inserted, error: insErr } = await supabase
    .from("experience_bookings")
    .insert({
      experience_id: exp.id,
      guest_id: user.id,
      date: dateYmd,
      num_participants: numParticipants,
      total_price_ore: totalPriceOre,
      service_fee_ore: serviceFeeOre,
      platform_fee_ore: platformFeeOre,
      status: "pending",
    })
    .select("id")
    .single()

  if (insErr || !inserted) {
    return { error: insErr?.message || "Kunne ikke oprette booking" }
  }

  const bookingId = (inserted as { id: string }).id
  const base = getAppBaseUrl()
  const idempotencyKey = `exp-booking-${bookingId}`.replace(/[^a-zA-Z0-9\-_.]/g, "-").slice(0, 255)

  const lineItems: Array<{
    quantity: number
    price_data: {
      currency: "dkk"
      unit_amount: number
      product_data: { name: string }
    }
  }> = [
    {
      quantity: 1,
      price_data: {
        currency: "dkk",
        unit_amount: totalPriceOre,
        product_data: {
          name: `Oplevelse: ${exp.title}`,
        },
      },
    },
  ]

  if (serviceFeeOre > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: "dkk",
        unit_amount: serviceFeeOre,
        product_data: { name: "Servicegebyr (12%)" },
      },
    })
  }

  const metaPi = {
    type: "experience_booking",
    experience_id: exp.id,
    guest_id: user.id,
    date: dateYmd,
    num_participants: String(numParticipants),
    booking_id: bookingId,
  }

  try {
    const sessionCheckout = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        payment_method_types: ["card"],
        line_items: lineItems,
        payment_intent_data: {
          application_fee_amount: applicationFeeAmount,
          transfer_data: {
            destination: stripeInfo.stripe_account_id,
          },
          metadata: metaPi,
        },
        success_url: `${base}/booking/oplevelse-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${base}/oplevelser/${exp.id}`,
        metadata: {
          type: "experience_booking",
          booking_id: bookingId,
          experience_id: exp.id,
          guest_id: user.id,
          date: dateYmd,
          num_participants: String(numParticipants),
        },
      },
      { idempotencyKey },
    )

    if (!sessionCheckout.url) {
      throw new Error("Manglende session-URL")
    }

    const service = createServiceClient()
    const { error: upErr } = await service
      .from("experience_bookings")
      .update({
        stripe_session_id: sessionCheckout.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId)

    if (upErr) {
      throw upErr
    }

    return { url: sessionCheckout.url }
  } catch (e) {
    console.error("[createExperienceBooking]", e)
    const service = createServiceClient()
    await service.from("experience_bookings").delete().eq("id", bookingId)
    return {
      error:
        e instanceof Error
          ? e.message
          : "Betalingen kunne ikke startes. Prøv igen.",
    }
  }
}
