export type CabinPropertyType = "cabin" | "residence"

/** Gæsteside: anmod om ophold (query `type=stay` er kanonisk). */
export const guestStayRequestHref = "/anmod?type=stay" as const

export function publishedCabinDetailPath(
  propertyType: string | null | undefined,
  id: string,
): string {
  return propertyType === "residence" ? `/ophold/i-byen/${id}` : `/ophold/i-naturen/${id}`
}
