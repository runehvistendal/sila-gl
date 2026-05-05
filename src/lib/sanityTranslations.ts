/** Sanitets-dokument med _da / _en suffiks (fx globalSettings). */
export function tField(obj: unknown, key: string, locale: string): string {
  if (!obj || typeof obj !== "object") return ""
  const o = obj as Record<string, string | undefined>
  return o[`${key}_${locale}`] ?? o[`${key}_da`] ?? ""
}

/** Tom Sanity → brug bundlet fallback (fx efter redaktør har slettet felt). */
export function tWithFallback(obj: unknown, key: string, locale: string, fallback: string): string {
  const v = tField(obj, key, locale).trim()
  return v.length > 0 ? v : fallback
}
