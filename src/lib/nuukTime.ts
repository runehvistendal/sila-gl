/**
 * Vestgrønland (Nuuk) — IANA 'America/Nuuk' (alias 'America/Godthab').
 *
 * OBS: Grønland skiftede tidszone i 2023. Siden 2024 er Nuuk UTC-2 om vinteren
 * og UTC-1 om sommeren (sommertid). Det tidligere hardkodede "-03:00" gemte
 * afgangstider 1-2 timer forkert. Brug ALTID nuukInputToUtc() ved lagring og
 * disse formatters ved visning — aldrig en fast offset.
 */

const TZ = "America/Nuuk"

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
  return t.replace(".", ":") === "00:00" ? null : t
}

/** "20. jun 2026 kl. 09:00" */
export function formatNuukFull(iso: string): string {
  const d = formatNuukDate(iso)
  const t = formatNuukTime(iso)
  return t ? `${d} kl. ${t}` : d
}

/** Nuuks UTC-offset i minutter på et givet tidspunkt (fx -60 om sommeren). */
export function nuukOffsetMinutes(utcMs: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs))
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0)
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"))
  return Math.round((asUtc - utcMs) / 60000)
}

/**
 * Konvertér brugerens dato+tid-input (Nuuk-lokal tid) til UTC ISO-streng.
 * Tager højde for sommertid. `time` udeladt = midnat.
 */
export function nuukInputToUtc(date: string, time = "00:00"): string {
  const naive = Date.parse(`${date}T${time.length === 5 ? `${time}:00` : time}Z`)
  if (Number.isNaN(naive)) throw new Error(`Ugyldig dato/tid: ${date} ${time}`)
  const first = naive - nuukOffsetMinutes(naive) * 60000
  // Gentag én gang omkring DST-skift, hvor offset kan ændre sig
  const utc = naive - nuukOffsetMinutes(first) * 60000
  return new Date(utc).toISOString()
}

/** Dagens dato i Nuuk (YYYY-MM-DD) — brug til "ikke i fortiden"-validering. */
export function nuukTodayYmd(): string {
  return new Date().toLocaleString("sv-SE", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).slice(0, 10)
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
