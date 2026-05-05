/** Sanitets-dokument med _da / _en suffiks (fx globalSettings). */
export function tField(obj: unknown, key: string, locale: string): string {
  if (!obj || typeof obj !== "object") return ""
  const o = obj as Record<string, string | undefined>
  return o[`${key}_${locale}`] ?? o[`${key}_da`] ?? ""
}
