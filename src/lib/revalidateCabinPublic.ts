import { revalidatePath } from "next/cache"
import { publishedCabinDetailPath } from "@/lib/cabinPublicPaths"

/**
 * Invaliderer liste- og detaljesider for hytter/boliger (Next cache).
 * Kaldes fra server actions efter ændringer der påvirker public feed.
 */
export function revalidatePublishedCabinPaths(
  cabinId: string,
  propertyType: string | null | undefined,
) {
  revalidatePath("/ophold/i-naturen")
  revalidatePath("/ophold/i-byen")
  revalidatePath("/hytter")
  revalidatePath(publishedCabinDetailPath(propertyType, cabinId))
  if (propertyType !== "residence") {
    revalidatePath(`/hytter/${cabinId}`)
  }
}
