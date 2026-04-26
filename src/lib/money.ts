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
