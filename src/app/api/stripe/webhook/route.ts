import { NextResponse } from "next/server"
import type Stripe from "stripe"
import { headers } from "next/headers"
import { createServiceClient } from "@/lib/supabase-service"
import { stripe } from "@/lib/stripe"
import { revalidatePath } from "next/cache"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json(
      { error: "Mangler STRIPE_WEBHOOK_SECRET" },
      { status: 500 },
    )
  }

  const raw = await request.text()
  const signature = (await headers()).get("stripe-signature")
  if (!signature) {
    return NextResponse.json({ error: "Mangler signatur" }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(raw, signature, secret)
  } catch (err) {
    console.error("[stripe webhook] verify", err)
    return NextResponse.json({ error: "Ugyldig signatur" }, { status: 400 })
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session
    const sessionId = session.id
    const pi = session.payment_intent
    const paymentIntentId =
      typeof pi === "string" ? pi : pi && "id" in pi ? (pi as { id: string }).id : null

    if (!sessionId) {
      return NextResponse.json({ received: true })
    }

    const service = createServiceClient()

    const { data: row, error: findErr } = await service
      .from("cabin_bookings")
      .select("id, status, stripe_payment_intent_id, deleted_at")
      .eq("stripe_session_id", sessionId)
      .maybeSingle()

    if (findErr) {
      console.error("[stripe webhook] find booking", findErr)
      return NextResponse.json(
        { error: "DB-fejl" },
        { status: 500 },
      )
    }

    if (!row || (row as { deleted_at: string | null }).deleted_at) {
      return NextResponse.json({ received: true })
    }

    const b = row as { id: string; status: string; stripe_payment_intent_id: string | null }
    if (b.status === "confirmed" && b.stripe_payment_intent_id) {
      return NextResponse.json({ received: true })
    }

    if (!paymentIntentId) {
      console.error("[stripe webhook] mangler payment_intent", sessionId)
      return NextResponse.json({ received: true })
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
      console.error("[stripe webhook] update", upErr)
      return NextResponse.json({ error: "Opdatering fejlede" }, { status: 500 })
    }

    revalidatePath("/")
    revalidatePath("/profil")
    revalidatePath("/dashboard")
  }

  return NextResponse.json({ received: true })
}
