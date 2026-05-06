import type { TransportMapRoute } from "@/components/map/TransportMap"
import { findLocation, getLocationName } from "@/lib/greenlandLocations"

export type CabinMapPin = { id: string; title: string; location_hub: string }

/** Byg overview-ruter (from = to) så kun prik på kort tegnes. */
export function cabinPinsToMapRoutes(pins: CabinMapPin[]): TransportMapRoute[] {
  const routes: TransportMapRoute[] = []
  for (const c of pins) {
    const loc = findLocation(c.location_hub.trim())
    if (!loc) continue
    const hubLabel = getLocationName(c.location_hub)
    routes.push({
      id: c.id,
      fromName: c.title,
      fromLat: loc.latitude,
      fromLng: loc.longitude,
      toName: hubLabel,
      toLat: loc.latitude,
      toLng: loc.longitude,
      meta: { isCabin: true },
    })
  }
  return routes
}
