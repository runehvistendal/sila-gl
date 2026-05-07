export type CabinPropertyType = "cabin" | "residence"

export function publishedCabinDetailPath(
  propertyType: string | null | undefined,
  id: string,
): string {
  return propertyType === "residence" ? `/ophold/i-byen/${id}` : `/ophold/i-naturen/${id}`
}
