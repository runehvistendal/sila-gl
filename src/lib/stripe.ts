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
