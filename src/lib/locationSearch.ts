import Fuse from "fuse.js"
import {
  GREENLAND_LOCATIONS,
  getAllLocationsSorted,
  locationToId,
  type GreenlandLocation,
} from "./greenlandLocations"

const fuse = new Fuse(GREENLAND_LOCATIONS, {
  keys: [
    { name: "name_dk", weight: 0.45 },
    { name: "name_gl", weight: 0.35 },
    {
      name: "aliases",
      getFn: (loc: GreenlandLocation) => loc.aliases.join(" "),
      weight: 0.2,
    },
  ],
  threshold: 0.4,
  includeScore: true,
  ignoreLocation: true,
})

/**
 * Fuzzy-søgning i alle destinationer (dansk, grønlandsk, aliaser).
 * Tom query: alfabetisk udvalg til hurtig gennemgang.
 */
export function searchLocations(query: string): GreenlandLocation[] {
  const q = query.trim()
  if (!q) {
    return getAllLocationsSorted().slice(0, 40)
  }

  const seen = new Set<string>()
  const out: GreenlandLocation[] = []

  for (const { item } of fuse.search(q)) {
    const id = locationToId(item)
    if (seen.has(id)) continue
    seen.add(id)
    out.push(item)
  }

  return out
}
