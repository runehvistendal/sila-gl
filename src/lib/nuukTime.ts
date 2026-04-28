/**
 * Vestgrønland (Nuuk) bruger 'America/Godthab' — UTC-3, ingen sommertid.
 * Alle departure_at visninger i UI skal gå gennem disse hjælpefunktioner.
 */

const TZ = "America/Godthab"

/** "20. jun 2026" */
export function formatNuukDate(iso: string): string {
  return new Date(iso).toLocaleString("da-DK", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

/** "20. jun" (uden år) */
export function formatNuukDateShort(iso: string): string {
  return new Date(iso).toLocaleString("da-DK", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
  })
}

/** "09:00" — returnerer null hvis 00:00 (ingen tid angivet) */
export function formatNuukTime(iso: string): string | null {
  const t = new Date(iso).toLocaleString("da-DK", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
  return t === "00:00" ? null : t
}

/** "20. jun 2026 kl. 09:00" */
export function formatNuukFull(iso: string): string {
  const d = formatNuukDate(iso)
  const t = formatNuukTime(iso)
  return t ? `${d} kl. ${t}` : d
}

/**
 * Konvertér brugerens lokale dato+tid-input (antaget som Nuuk-lokal tid)
 * til UTC ISO-streng til DB-lagring.
 * Nuuk = UTC-3, så vi bruger -03:00 offset i ISO-strengen.
 */
export function nuukInputToUtc(date: string, time: string): string {
  return new Date(`${date}T${time}:00-03:00`).toISOString()
}

/** Nuuk-lokal dato (YYYY-MM-DD) fra ISO-streng — til dato-sammenligninger */
export function nuukDateYmd(iso: string): string {
  return new Date(iso).toLocaleString("sv-SE", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
}
