"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase-server"
import { createServiceClient } from "@/lib/supabase-service"
import { getAppBaseUrl } from "@/lib/appUrl"
import { stripe } from "@/lib/stripe"
import { calcServiceFee } from "@/lib/money"

function cabinMatchesStayProperty(
  stayProperty: string,
  cabinProperty: string,
): boolean {
  if (stayProperty === "any") return true
  return stayProperty === cabinProperty
}

function nightCountStay(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn + "T12:00:00.000Z").getTime()
  const b = new Date(checkOut + "T12:00:00.000Z").getTime()
  return Math.max(0, Math.round((b - a) / 86_400_000))
}

export type AcceptStayOfferResult =
  | { checkoutUrl: string }
  | { error: string }

/**
 * Gæst starter Stripe Checkout for et afventende tilbud.
 */
export async function acceptStayOffer(stayOfferId: string): Promise<AcceptStayOfferResult> {
  if (!process.env.STRIPE_SECRET_KEY) {
    return { error: "Betaling er ikke tilgængelig lige nu." }
  }
  if (!stayOfferId?.trim()) {
    return { error: "Ugyldigt tilbud." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: "Du skal være logget ind." }
  }

  const { error: rlErr } = await supabase.rpc("consume_rate_limit", {
    p_user_id:        user.id,
    p_action:         "accept_stay_offer",
    p_max_attempts:   10,
    p_window_seconds: 600,
  })
  if (rlErr) {
    return { error: "For mange forsøg. Prøv igen om lidt." }
  }

  const { data: row, error: rowErr } = await supabase
    .from("stay_offers")
    .select(`
      id,
      status,
      offered_price_ore,
      cabin_id,
      stay_request_id,
      stripe_session_id,
      stay_requests!inner (
        guest_id,
        status,
        desired_check_in,
        desired_check_out,
        num_guests
      ),
      cabins!inner (
        id,
        published,
        deleted_at,
        max_guests
      )
    `)
    .eq("id", stayOfferId)
    .maybeSingle()

  if (rowErr || !row) {
    return { error: "Tilbuddet findes ikke." }
  }

  const offer = row as {
    id: string
    status: string
    offered_price_ore: number
    cabin_id: string
    stay_request_id: string
    stripe_session_id: string | null
    stay_requests:
      | {
          guest_id: string
          status: string
          desired_check_in: string
          desired_check_out: string
          num_guests: number
        }
      | Array<{
          guest_id: string
          status: string
          desired_check_in: string
          desired_check_out: string
          num_guests: number
        }>
    cabins:
      | { id: string; published: boolean; deleted_at: string | null; max_guests: number }
      | Array<{ id: string; published: boolean; deleted_at: string | null; max_guests: number }>
  }

  const srRaw = offer.stay_requests
  const sr = Array.isArray(srRaw) ? srRaw[0] : srRaw
  const cabRaw = offer.cabins
  const cabin = Array.isArray(cabRaw) ? cabRaw[0] : cabRaw

  if (!sr || !cabin) {
    return { error: "Kunne ikke hente tilbudsdetaljer." }
  }

  if (sr.guest_id !== user.id) {
    return { error: "Dette tilbud er ikke til dig." }
  }
  if (sr.status !== "open") {
    return { error: "Anmodningen er ikke længere åben." }
  }
  if (offer.status !== "pending") {
    return { error: "Tilbuddet kan ikke længere accepteres." }
  }
  if (!cabin.published || cabin.deleted_at != null || cabin.id !== offer.cabin_id) {
    return { error: "Opslaget er ikke tilgængeligt." }
  }
  if (sr.num_guests > cabin.max_guests) {
    return { error: `Højst ${cabin.max_guests} gæster på dette opslag.` }
  }

  const offered = offer.offered_price_ore
  if (offered < 1) {
    return { error: "Ugyldigt tilbudsbeløb." }
  }

  if (offer.stripe_session_id) {
    return { error: "Betaling for dette tilbud er allerede startet. Åbn Stripe eller vent lidt." }
  }

  const { data: overlap } = await supabase
    .from("cabin_bookings")
    .select("id")
    .eq("cabin_id", offer.cabin_id)
    .in("status", ["pending", "confirmed", "completed"])
    .is("deleted_at", null)
    .lt("check_in", sr.desired_check_out)
    .gt("check_out", sr.desired_check_in)
    .limit(1)
    .maybeSingle()

  if (overlap) {
    return { error: "Opslaget er ikke ledigt i den ønskede periode." }
  }

  const { data: ownerRows, error: ownerErr } = await supabase.rpc("get_owner_stripe_info", {
    p_cabin_id: offer.cabin_id,
  })

  if (ownerErr || !ownerRows || (ownerRows as unknown[]).length === 0) {
    return { error: "Kunne ikke hente udbyder." }
  }
  const o = (ownerRows as Array<{
    stripe_account_id: string | null
    stripe_onboarding_complete: boolean
  }>)[0]
  if (!o.stripe_onboarding_complete || !o.stripe_account_id) {
    return {
      error:
        "Denne udbyder modtager ikke betalinger endnu — prøv et andet tilbud eller kontakt udbyderen.",
    }
  }

  const serviceFeeOre = calcServiceFee(offered)
  const applicationFeeAmount = Math.round(offered * 0.15) + serviceFeeOre
  const nights = Math.max(1, nightCountStay(sr.desired_check_in, sr.desired_check_out))
  const nightsLabel = `${nights} ${nights === 1 ? "nat" : "nætter"}`

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
        unit_amount: offered,
        product_data: {
          name: `Ophold (${nightsLabel}) — tilbud`,
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
        product_data: { name: "Servicegebyr (3%)" },
      },
    })
  }

  const base = getAppBaseUrl()
  const idempotencyKey = `stay-offer-${stayOfferId}-${user.id}`.replace(/[^a-zA-Z0-9\-_.]/g, "-").slice(0, 255)

  let sessionCheckout: Awaited<ReturnType<typeof stripe.checkout.sessions.create>> | null = null
  try {
    sessionCheckout = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        payment_method_types: ["card"],
        line_items: lineItems,
        payment_intent_data: {
          application_fee_amount: applicationFeeAmount,
          transfer_data: {
            destination: o.stripe_account_id,
          },
          metadata: {
            stay_offer_id:   offer.id,
            stay_request_id: offer.stay_request_id,
            cabin_id:        offer.cabin_id,
            guest_id:        user.id,
          },
        },
        success_url: `${base}/booking/stay-offer-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url:  `${base}/dashboard/mine-oensker/${offer.stay_request_id}`,
        metadata: {
          type:             "stay_offer",
          stay_offer_id:    offer.id,
          stay_request_id:  offer.stay_request_id,
          cabin_id:         offer.cabin_id,
          guest_id:         user.id,
        },
      },
      { idempotencyKey },
    )
  } catch (e) {
    console.error("[acceptStayOffer] stripe", e)
    return {
      error:
        e instanceof Error
          ? e.message
          : "Betalingen kunne ikke startes. Prøv igen.",
    }
  }

  if (!sessionCheckout?.url) {
    return { error: "Manglende betalings-URL." }
  }

  const service = createServiceClient()
  const { data: patched, error: patchErr } = await service
    .from("stay_offers")
    .update({
      stripe_session_id: sessionCheckout.id,
      updated_at:        new Date().toISOString(),
    })
    .eq("id", offer.id)
    .is("stripe_session_id", null)
    .select("id")
    .maybeSingle()

  if (patchErr || !patched) {
    try {
      await stripe.checkout.sessions.expire(sessionCheckout.id)
    } catch {
      /* */
    }
    return { error: "Tilbuddet er allerede i betaling. Opdater siden." }
  }

  revalidatePath("/dashboard")
  revalidatePath(`/dashboard/mine-oensker/${offer.stay_request_id}`)
  return { checkoutUrl: sessionCheckout.url }
}

/**
 * Udbyder sender tilbud på et af egne opslag til en åben stay_request.
 */
export async function sendStayOffer(
  stayRequestId: string,
  cabinId: string,
  offeredPriceOre: number,
  message?: string | null,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: "Du skal være logget ind." }
  }

  const { error: rlErr } = await supabase.rpc("consume_rate_limit", {
    p_user_id:        user.id,
    p_action:         "send_stay_offer",
    p_max_attempts:   20,
    p_window_seconds: 600,
  })
  if (rlErr) {
    return { error: "For mange forsøg. Prøv igen om lidt." }
  }

  if (!stayRequestId || !cabinId) {
    return { error: "Ugyldig anmodning." }
  }
  if (
    typeof offeredPriceOre !== "number" ||
    !Number.isFinite(offeredPriceOre) ||
    offeredPriceOre < 1 ||
    !Number.isInteger(offeredPriceOre)
  ) {
    return { error: "Angiv en gyldig pris i hele kroner." }
  }

  const { data: stay, error: stayErr } = await supabase
    .from("stay_requests")
    .select("id, status, guest_id, property_type")
    .eq("id", stayRequestId)
    .maybeSingle()

  if (stayErr || !stay) {
    return { error: "Anmodningen findes ikke." }
  }
  if (stay.status !== "open") {
    return { error: "Anmodningen er ikke længere åben." }
  }
  if (stay.guest_id === user.id) {
    return { error: "Du kan ikke byde på din egen anmodning." }
  }

  const { data: cabin, error: cabErr } = await supabase
    .from("cabins")
    .select("id, owner_id, published, deleted_at, property_type")
    .eq("id", cabinId)
    .maybeSingle()

  if (cabErr || !cabin) {
    return { error: "Opslaget findes ikke." }
  }
  if (cabin.owner_id !== user.id || !cabin.published || cabin.deleted_at != null) {
    return { error: "Du kan kun byde med et publiceret opslag, du ejer." }
  }

  if (!cabinMatchesStayProperty(stay.property_type, cabin.property_type)) {
    return { error: "Opslagstypen matcher ikke gæstens ønske." }
  }

  const { data: existing } = await supabase
    .from("stay_offers")
    .select("id")
    .eq("stay_request_id", stayRequestId)
    .eq("cabin_id", cabinId)
    .eq("status", "pending")
    .maybeSingle()

  if (existing) {
    return { error: "Du har allerede et afventende tilbud på dette opslag." }
  }

  const trimmed = message?.trim()
  const { error: insErr } = await supabase.from("stay_offers").insert({
    stay_request_id:   stayRequestId,
    provider_id:       user.id,
    cabin_id:          cabinId,
    offered_price_ore: offeredPriceOre,
    message:           trimmed && trimmed.length > 0 ? trimmed : null,
  })

  if (insErr) {
    return { error: "Kunne ikke gemme tilbuddet. Prøv igen." }
  }

  revalidatePath("/dashboard")
  revalidatePath(`/dashboard/oensker/${stayRequestId}`)
  revalidatePath(`/dashboard/mine-oensker/${stayRequestId}`)
  return { success: true }
}
