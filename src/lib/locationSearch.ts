import Fuse from "fuse.js"
import {
  GREENLAND_LOCATIONS,
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

/** Lavere tal = højere prioritet i default-lister (by → … → fåreholdersted). */
export function getTypeOrder(type: GreenlandLocation["type"]): number {
  switch (type) {
    case "by":
      return 0
    case "bygd":
      return 1
    case "hyttested":
      return 2
    case "naturområde":
      return 3
    case "fåreholdersted":
      return 4
    default: {
      const _exhaustive: never = type
      return _exhaustive
    }
  }
}

function sortDefaultBrowse(locations: GreenlandLocation[]): GreenlandLocation[] {
  return [...locations].sort((a, b) => {
    if (a.is_major_hub !== b.is_major_hub) {
      return a.is_major_hub ? -1 : 1
    }
    const typeDiff = getTypeOrder(a.type) - getTypeOrder(b.type)
    if (typeDiff !== 0) return typeDiff
    return b.population - a.population
  })
}

/**
 * Fuzzy-søgning i alle destinationer (dansk, grønlandsk, aliaser).
 * Tom query: top 40 med hub/type/population-prioritet.
 */
export function searchLocations(query: string): GreenlandLocation[] {
  const q = query.trim()
  if (!q) {
    return sortDefaultBrowse(GREENLAND_LOCATIONS).slice(0, 40)
  }

  const hits = fuse.search(q).map((h) => ({
    item: h.item,
    adjustedScore: (h.score ?? 1) * (h.item.is_major_hub ? 0.8 : 1),
  }))

  hits.sort((a, b) => a.adjustedScore - b.adjustedScore)

  const seen = new Set<string>()
  const out: GreenlandLocation[] = []

  for (const { item } of hits) {
    const id = locationToId(item)
    if (seen.has(id)) continue
    seen.add(id)
    out.push(item)
  }

  return out
}
