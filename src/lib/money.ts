/**
 * Monetary conversion helpers.
 * ALL money conversions MUST go through these functions — never inline.
 * Database stores amounts in ØRE (integer). UI shows DKK.
 * Stripe expects ØRE — pass directly without conversion.
 */

export function krToOre(kr: number): number {
  return Math.round(kr * 100)
}

export function oreToKr(ore: number): number {
  return ore / 100
}

export function formatKr(ore: number): string {
  return (ore / 100).toLocaleString("da-DK", {
    style: "currency",
    currency: "DKK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

/** Guest service fee: 3 % of subtotal (øre). Server-side source of truth for checkout. */
export function calcServiceFee(total_price_ore: number): number {
  return Math.round(total_price_ore * 0.03)
}
