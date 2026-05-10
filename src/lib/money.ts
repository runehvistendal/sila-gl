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

/** Guest service fee: 12 % of provider subtotal (øre). Server-side source of truth for checkout. */
export function calcServiceFee(total_price_ore: number): number {
  return Math.round(total_price_ore * 0.12)
}

/** Platform commission charged from host: 5 % of provider subtotal (øre). */
export function calcPlatformFee(price_ore: number): number {
  return Math.round(price_ore * 0.05)
}

/** Guest-facing price in øre from a provider-listed amount (e.g. per nat / per plads), incl. 12 % servicegebyr. */
export function calcDisplayPrice(price_ore: number): number {
  return Math.round(price_ore * 1.12)
}
