import Stripe from "stripe"

/**
 * Server-only. `apiVersion` skal matche stripe-node v22-typer (2026-04-22.dahlia);
 * Kan ikke bruge ældre streng uden type-brud.
 * Kræver STRIPE_SECRET_KEY i runtime.
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2026-04-22.dahlia",
  typescript: true,
})

/**
 * Checkout-sessioner udløber efter 30 min (Stripes minimum).
 * pg_cron annullerer pending bookinger efter 35 min — dermed kan en betaling
 * aldrig gennemføres efter at pladsen/datoerne er frigivet til andre.
 * Uden expires_at lever en session 24 timer (Stripe-default).
 */
export const CHECKOUT_SESSION_TTL_MINUTES = 30

export function checkoutSessionExpiresAt(): number {
  return Math.floor(Date.now() / 1000) + CHECKOUT_SESSION_TTL_MINUTES * 60 + 30
}

export type RefundResult =
  | { ok: true; refundId: string; amountOre: number }
  | { ok: false; error: string }

/**
 * Refunderer en destination charge.
 * - reverse_transfer: trækker udbyderens andel tilbage fra connected account
 * - refund_application_fee: Sila giver sit gebyr (5 % + 12 %) forholdsmæssigt tilbage
 *
 * `amountOre` udeladt = fuld refusion. Idempotent pr. nøgle, så webhook-retries
 * og dobbeltklik ikke refunderer to gange.
 */
export async function refundPaymentIntent(
  paymentIntentId: string,
  opts: { amountOre?: number; idempotencyKey: string; reason?: Stripe.RefundCreateParams.Reason },
): Promise<RefundResult> {
  if (!process.env.STRIPE_SECRET_KEY) return { ok: false, error: "Stripe er ikke konfigureret" }
  try {
    const refund = await stripe.refunds.create(
      {
        payment_intent: paymentIntentId,
        ...(opts.amountOre != null ? { amount: opts.amountOre } : {}),
        reverse_transfer: true,
        refund_application_fee: true,
        reason: opts.reason ?? "requested_by_customer",
      },
      { idempotencyKey: opts.idempotencyKey },
    )
    return { ok: true, refundId: refund.id, amountOre: refund.amount }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Refusion fejlede" }
  }
}
