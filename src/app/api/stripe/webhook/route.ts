import type Stripe from "stripe"
import { headers } from "next/headers"
import { createServiceClient } from "@/lib/supabase-service"
import { stripe } from "@/lib/stripe"
import { revalidatePath } from "next/cache"
import { notifyTransportBookingConfirmed } from "@/lib/notifications"

export const dynamic = "force-dynamic"

const isDev = process.env.NODE_ENV === "development"

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

      // Mark offer as accepted
      await service
        .from("transport_offers")
        .update({ status: "accepted", updated_at: new Date().toISOString() })
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

    // ── Cabin booking (existing logic) ──────────────────────────────────────
    const pi = session.payment_intent
    const paymentIntentId =
      typeof pi === "string" ? pi : pi && "id" in pi ? (pi as { id: string }).id : null

    const { data: row, error: findErr } = await service
      .from("cabin_bookings")
      .select("id, status, stripe_payment_intent_id, deleted_at")
      .eq("stripe_session_id", sessionId)
      .maybeSingle()

    if (findErr) {
      if (isDev) console.error("[stripe webhook] find booking", findErr)
      return new Response("DB-fejl", { status: 500 })
    }

    if (!row || (row as { deleted_at: string | null }).deleted_at) {
      return new Response("ok", { status: 200 })
    }

    const b = row as { id: string; status: string; stripe_payment_intent_id: string | null }
    if (b.status === "confirmed" && b.stripe_payment_intent_id) {
      return new Response("ok", { status: 200 })
    }

    if (!paymentIntentId) {
      if (isDev) console.error("[stripe webhook] mangler payment_intent", sessionId)
      return new Response("ok", { status: 200 })
    }

    const { error: upErr } = await service
      .from("cabin_bookings")
      .update({
        status: "confirmed",
        stripe_payment_intent_id: paymentIntentId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", b.id)
      .is("deleted_at", null)

    if (upErr) {
      if (isDev) console.error("[stripe webhook] update", upErr)
      return new Response("Opdatering fejlede", { status: 500 })
    }

    revalidatePath("/")
    revalidatePath("/profil")
    revalidatePath("/dashboard")
  }

  return new Response("ok", { status: 200 })
}
