/**
 * Samsejlads — aflysnings- og refusionsregler.
 * Neutral fil: importeres både af klientkomponenter og server actions.
 *
 * Gæsten:  gratis afbestilling indtil 48 timer før afgang (fuld refusion inkl.
 *          servicegebyr). Senere: ingen refusion — pladsen frigives dog til andre.
 * Sejleren: kan altid aflyse (vejr, is, sikkerhed, sygdom). Alle passagerer får
 *          fuld refusion automatisk. Vejr-aflysning tæller ikke negativt.
 */
export const RIDE_SHARE_FREE_CANCELLATION_HOURS = 48

export type RideShareCancelReason = "weather" | "skipper_cancelled"

export function hoursUntil(iso: string, now = Date.now()): number {
  return (new Date(iso).getTime() - now) / 3_600_000
}

export function passengerGetsFullRefund(departureIso: string, now = Date.now()): boolean {
  return hoursUntil(departureIso, now) >= RIDE_SHARE_FREE_CANCELLATION_HOURS
}
