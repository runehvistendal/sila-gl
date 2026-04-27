import type Stripe from "stripe"
import { headers } from "next/headers"
import { createServiceClient } from "@/lib/supabase-service"
import { stripe } from "@/lib/stripe"
import { revalidatePath } from "next/cache"

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
    const pi = session.payment_intent
    const paymentIntentId =
      typeof pi === "string" ? pi : pi && "id" in pi ? (pi as { id: string }).id : null

    if (!sessionId) {
      return new Response("ok", { status: 200 })
    }

    const service = createServiceClient()

    const { data: row, error: findErr } = await service
      .from("cabin_bookings")
      .select("id, status, stripe_payment_intent_id, deleted_at")
      .eq("stripe_session_id", sessionId)
      .maybeSingle()

    if (findErr) {
      if (isDev) {
        console.error("[stripe webhook] find booking", findErr)
      }
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
      if (isDev) {
        console.error("[stripe webhook] mangler payment_intent", sessionId)
      }
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
      if (isDev) {
        console.error("[stripe webhook] update", upErr)
      }
      return new Response("Opdatering fejlede", { status: 500 })
    }

    revalidatePath("/")
    revalidatePath("/profil")
    revalidatePath("/dashboard")
  }

  return new Response("ok", { status: 200 })
}
