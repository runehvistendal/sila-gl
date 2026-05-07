"use server"

import { revalidatePath } from "next/cache"
import { requireSession } from "@/lib/requireSession"
import { getAppBaseUrl } from "@/lib/appUrl"
import { stripe } from "@/lib/stripe"
import { krToOre, calcServiceFee } from "@/lib/money"
import {
  notifyNewTransportOffer,
  notifyTransportOfferAccepted,
} from "@/lib/notifications"
import { getLocationName } from "@/lib/greenlandLocations"

// ── Send chat message ────────────────────────────────────────────────────────

export type SendMessageResult = { error: string } | { ok: true }

export async function sendTransportMessage(
  requestId: string,
  content: string,
): Promise<SendMessageResult> {
  if (!content.trim()) return { error: "Tom besked" }

  const { supabase, user } = await requireSession()

  // Verify request exists and is open/matched
  const { data: req } = await supabase
    .from("transport_requests")
    .select("id, guest_id, status")
    .eq("id", requestId)
    .in("status", ["open", "matched"])
    .is("deleted_at", null)
    .maybeSingle()

  if (!req) return { error: "Anmodning ikke fundet eller lukket" }

  const reqData = req as { id: string; guest_id: string; status: string }

  // Must be requester OR have an existing offer
  const isRequester = reqData.guest_id === user.id
  if (!isRequester) {
    const { data: myOffer } = await supabase
      .from("transport_offers")
      .select("id")
      .eq("request_id", requestId)
      .eq("skipper_id", user.id)
      .is("deleted_at", null)
      .maybeSingle()
    if (!myOffer) return { error: "Du skal have afgivet et tilbud for at sende beskeder" }
  }

  const { error } = await supabase.from("messages").insert({
    sender_id:           user.id,
    recipient_id:        reqData.guest_id,
    transport_request_id: requestId,
    content:             content.trim(),
  })

  if (error) return { error: error.message }
  revalidatePath(`/transport/anmodninger/${requestId}`)
  return { ok: true }
}

// ── Submit transport offer ──────────────────────────────────────────────────

export type SubmitOfferInput = {
  requestId:  string
  priceKr:    number
  numSeats:   number
  note?:      string
}

export type SubmitOfferResult = { error: string } | { ok: true; offerId: string }

export async function submitTransportOffer(
  input: SubmitOfferInput,
): Promise<SubmitOfferResult> {
  const { supabase, user } = await requireSession()

  const priceOre = krToOre(input.priceKr)
  if (!Number.isFinite(priceOre) || priceOre < 100) {
    return { error: "Pris skal være mindst 1 kr." }
  }
  const seats = Math.floor(input.numSeats)
  if (!Number.isFinite(seats) || seats < 1 || seats > 50) {
    return { error: "Antal pladser 1–50" }
  }

  // Verify request exists and is open
  const { data: req } = await supabase
    .from("transport_requests")
    .select("id, guest_id, status")
    .eq("id", input.requestId)
    .eq("status", "open")
    .is("deleted_at", null)
    .maybeSingle()

  if (!req) return { error: "Anmodning ikke tilgængelig" }
  const reqData = req as { id: string; guest_id: string }
  if (reqData.guest_id === user.id) return { error: "Du kan ikke byde på din egen anmodning" }

  // Upsert offer (one offer per skipper per request)
  const { data: existing } = await supabase
    .from("transport_offers")
    .select("id")
    .eq("request_id", input.requestId)
    .eq("skipper_id", user.id)
    .eq("status", "pending")
    .is("deleted_at", null)
    .maybeSingle()

  let offerId: string

  if (existing) {
    const existingData = existing as { id: string }
    const { error } = await supabase
      .from("transport_offers")
      .update({
        price_ore:  priceOre,
        num_seats:  seats,
        message:    input.note?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingData.id)
      .eq("skipper_id", user.id)

    if (error) return { error: error.message }
    offerId = existingData.id
  } else {
    const { data: inserted, error } = await supabase
      .from("transport_offers")
      .insert({
        request_id: input.requestId,
        skipper_id: user.id,
        price_ore:  priceOre,
        num_seats:  seats,
        message:    input.note?.trim() || null,
        status:     "pending",
      })
      .select("id")
      .single()

    if (error || !inserted) return { error: error?.message ?? "Fejl" }
    offerId = (inserted as { id: string }).id

    // Auto-insert welcome message in chat when first offer
    await supabase.from("messages").insert({
      sender_id:            user.id,
      recipient_id:         reqData.guest_id,
      transport_request_id: input.requestId,
      content:              "Hej! Jeg har afgivet et tilbud på din transportanmodning.",
    })
  }

  await notifyNewTransportOffer(offerId)
  revalidatePath(`/transport/anmodninger/${input.requestId}`)
  return { ok: true, offerId }
}

// ── Accept offer → Stripe Checkout ─────────────────────────────────────────

export type AcceptOfferResult = { url: string } | { error: string }

export async function acceptTransportOffer(offerId: string): Promise<AcceptOfferResult> {
  if (!process.env.STRIPE_SECRET_KEY) {
    return { error: "Betaling er ikke tilgængelig" }
  }

  const { supabase, user } = await requireSession()

  // Get offer + request — requester only
  const { data: offerRow } = await supabase
    .from("transport_offers")
    .select(`
      id, request_id, skipper_id, price_ore, num_seats, message, status,
      transport_requests!request_id ( id, guest_id, from_location, to_location, status )
    `)
    .eq("id", offerId)
    .eq("status", "pending")
    .is("deleted_at", null)
    .maybeSingle()

  if (!offerRow) return { error: "Tilbud ikke fundet" }

  const offer = offerRow as unknown as {
    id: string
    request_id: string
    skipper_id: string
    price_ore: number
    num_seats: number
    message: string | null
    status: string
    transport_requests: {
      id: string
      guest_id: string
      from_location: string
      to_location: string
      status: string
    } | null
  }

  if (!offer.transport_requests) return { error: "Anmodning ikke fundet" }
  if (offer.transport_requests.guest_id !== user.id) {
    return { error: "Kun anmoderen kan acceptere tilbud" }
  }
  if (offer.transport_requests.status !== "open") {
    return { error: "Anmodningen er ikke længere åben" }
  }

  // Get skipper Stripe info via security-definer RPC
  const { data: stripeRows, error: stripeErr } = await supabase.rpc(
    "get_transport_offer_stripe_info",
    { p_offer_id: offerId },
  )

  if (stripeErr || !stripeRows || (stripeRows as unknown[]).length === 0) {
    return { error: "Kunne ikke hente sejlerens betalingskonto" }
  }

  const s = (stripeRows as Array<{
    stripe_account_id: string | null
    stripe_onboarding_complete: boolean
  }>)[0]

  if (!s.stripe_onboarding_complete || !s.stripe_account_id) {
    return { error: "Sejleren modtager endnu ikke betalinger — prøv igen senere" }
  }

  const platformFee = Math.round(offer.price_ore * 0.15)
  const serviceFeeOre = calcServiceFee(offer.price_ore)
  const base        = getAppBaseUrl()
  const requestId   = offer.request_id

  try {
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
          unit_amount: offer.price_ore,
          product_data: {
            name: `Transport: ${getLocationName(offer.transport_requests.from_location)} → ${getLocationName(offer.transport_requests.to_location)}`,
            description: offer.message ?? undefined,
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

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,
      payment_intent_data: {
        application_fee_amount: platformFee + serviceFeeOre,
        transfer_data:          { destination: s.stripe_account_id },
        metadata: {
          transport_offer_id:   offerId,
          transport_request_id: requestId,
          type:                 "transport",
        },
      },
      success_url: `${base}/transport/anmodninger/${requestId}?success=1`,
      cancel_url:  `${base}/transport/anmodninger/${requestId}`,
      metadata: {
        transport_offer_id:   offerId,
        transport_request_id: requestId,
        type:                 "transport",
      },
    })

    if (!session.url) throw new Error("Manglende session-URL")

    // Save stripe session id on the offer
    await supabase
      .from("transport_offers")
      .update({
        stripe_session_id: session.id,
        service_fee_ore: serviceFeeOre,
        updated_at: new Date().toISOString(),
      })
      .eq("id", offerId)
      .eq("skipper_id", offer.skipper_id)

    await notifyTransportOfferAccepted(offerId)
    return { url: session.url }
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Betalingen kunne ikke startes",
    }
  }
}
