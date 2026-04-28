"use client"

import { useState } from "react"
import { Search, MapPin, House, Anchor } from "lucide-react"
import { GREENLAND_LOCATIONS } from "@/lib/greenlandLocations"

type Category = "hytter" | "transport"

const majorHubs = GREENLAND_LOCATIONS.filter((l) => l.is_major_hub)
const quickCities = GREENLAND_LOCATIONS.filter((l) => l.type === "by").slice(0, 6)

const CATEGORY_CONFIG = {
  hytter: {
    Icon: House,
    label: "Hytteudlejning",
    locationPlaceholder: "Alle destinationer",
    cityPrefix: "Hytter i",
    href: "/hytter",
  },
  transport: {
    Icon: Anchor,
    label: "Samsejlads & transport",
    locationPlaceholder: "Alle afgangsbyer",
    cityPrefix: "Sejlads fra",
    href: "/transport",
  },
} as const

export default function HeroSearch() {
  const [category, setCategory] = useState<Category>("hytter")
  const config = CATEGORY_CONFIG[category]
  const { Icon } = config

  return (
    <div>
      <div
        className="flex flex-col sm:flex-row rounded-2xl overflow-hidden border max-w-2xl"
        style={{
          backgroundColor: "rgba(9,25,42,0.88)",
          backdropFilter: "blur(16px)",
          borderColor: "rgba(74,156,199,0.3)",
        }}
      >
        <div
          className="flex items-center gap-2 px-4 py-3.5 sm:border-r min-w-[160px]"
          style={{ borderColor: "rgba(74,156,199,0.2)" }}
        >
          <Icon size={15} style={{ color: "#4A9CC7", flexShrink: 0 }} />
          <select
            className="bg-transparent text-sm outline-none cursor-pointer w-full"
            style={{ color: "#E8F4F8" }}
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
          >
            <option value="hytter">Hytteudlejning</option>
            <option value="transport">Samsejlads & transport</option>
          </select>
        </div>

        <div
          className="flex items-center gap-2 px-4 py-3.5 flex-1 sm:border-r"
          style={{ borderColor: "rgba(74,156,199,0.2)" }}
        >
          <MapPin size={15} style={{ color: "#4A9CC7", flexShrink: 0 }} />
          <select
            className="bg-transparent text-sm outline-none cursor-pointer w-full"
            style={{ color: "#E8F4F8" }}
          >
            <option value="">{config.locationPlaceholder}</option>
            {majorHubs.map((loc) => (
              <option key={loc.postal_code} value={loc.postal_code}>
                {loc.name_dk}
              </option>
            ))}
          </select>
        </div>

        <button
          className="flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold transition-opacity hover:opacity-90 active:opacity-75 whitespace-nowrap"
          style={{ backgroundColor: "#4A9CC7", color: "#09192A" }}
        >
          <Search size={15} />
          Søg
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        {quickCities.map((loc) => (
          <button
            key={loc.postal_code}
            className="text-xs px-3 py-1.5 rounded-full border transition-all hover:border-[rgba(74,156,199,0.55)] hover:bg-[rgba(74,156,199,0.12)]"
            style={{
              color: "#A8D8EA",
              borderColor: "rgba(74,156,199,0.22)",
              backgroundColor: "rgba(74,156,199,0.06)",
            }}
          >
            {config.cityPrefix} {loc.name_dk}
          </button>
        ))}
      </div>
    </div>
  )
}