/**
 * Ønsket afgangsvindue på en transportefterspørgsel.
 * Neutral fil: bruges både af server- og klientkomponenter.
 * "09:00:00" + "12:00:00" → "kl. 09:00–12:00" (Nuuk-tid)
 */
export function timeWindowLabel(from?: string | null, to?: string | null): string | null {
  const f = from?.slice(0, 5)
  const t = to?.slice(0, 5)
  if (f && t) return `kl. ${f}–${t}`
  if (f) return `tidligst kl. ${f}`
  if (t) return `senest kl. ${t}`
  return null
}
