"use client"

import { useCallback, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { useRouter } from "@/i18n/navigation"
import { captureEvent } from "@/lib/analytics/posthog-events"
import CabinFilters, { type FilterValues } from "@/components/cabins/CabinFilters"
import CabinGrid from "@/components/cabins/CabinGrid"
import type { CabinCardData } from "@/components/cabins/CabinCard"
import {
  GREENLAND_LOCATIONS,
  representativeHubForRegion,
} from "@/lib/greenlandLocations"
import { cn } from "@/lib/utils"

const REGION_CHIPS = [
  "Nuuk & omegn",
  "Diskobugten",
  "Sydgrønland",
  "Midtgrønland",
  "Østgrønland",
  "Nordgrønland",
  "Diskoøen",
] as const

interface Props {
  cabins: CabinCardData[]
  initialFilters: FilterValues
}

export default function HytterClient({ cabins, initialFilters }: Props) {
  const t = useTranslations("cabins")
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([])

  const hubRegion = initialFilters.hub
    ? GREENLAND_LOCATIONS.find((l) => l.name_dk === initialFilters.hub)
        ?.region_label ?? null
    : null

  const applyHub = useCallback(
    (hubName: string | null) => {
      const p = new URLSearchParams(searchParams.toString())
      if (!hubName) p.delete("hub")
      else p.set("hub", hubName)
      const qs = p.toString()
      router.push(`/hytter${qs ? `?${qs}` : ""}`)
    },
    [router, searchParams],
  )

  const filteredCabins = useMemo(() => {
    if (selectedAmenities.length === 0) return cabins
    return cabins.filter((c) =>
      selectedAmenities.every((a) => c.amenities?.includes(a)),
    )
  }, [cabins, selectedAmenities])

  return (
    <>
      {/* ── Filter header ── */}
      <div className="bg-card border-b border-border pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {t("pageTitle")}
          </h1>
          <CabinFilters
            initialFilters={initialFilters}
            selectedAmenities={selectedAmenities}
            onAmenityChange={(keys) => {
              setSelectedAmenities(keys)
              captureEvent("filter_applied", {
                type: "hytte",
                filter_key: "amenities",
                filter_value: keys.join(","),
              })
            }}
          />
        </div>
      </div>

      {/* ── Region-chips + grid ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        <div className="-mx-4 sm:mx-0">
          <div
            className="flex gap-2 overflow-x-auto px-4 sm:px-0 pb-1 snap-x snap-mandatory [scrollbar-width:thin]"
            role="group"
            aria-label="Regioner"
          >
            {REGION_CHIPS.map((label) => {
              const anchor = representativeHubForRegion(label)
              const active = hubRegion === label
              return (
                <button
                  key={label}
                  type="button"
                  disabled={!anchor}
                  onClick={() => {
                    if (!anchor) return
                    applyHub(anchor)
                    captureEvent("filter_applied", {
                      type: "hytte",
                      filter_key: "region_chip",
                      filter_value: label,
                    })
                  }}
                  className={cn(
                    "shrink-0 snap-start rounded-full border px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-muted/40 text-foreground hover:border-primary/50 hover:bg-muted",
                  )}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        <CabinGrid cabins={filteredCabins} total={filteredCabins.length} />
        {selectedAmenities.length > 0 && filteredCabins.length === 0 && (
          <p className="text-center text-muted-foreground text-sm mt-8">
            {t("noMatch")}{" "}
            <button
              type="button"
              onClick={() => setSelectedAmenities([])}
              className="text-primary hover:underline"
            >
              {t("clearFilters")}
            </button>
          </p>
        )}
      </div>
    </>
  )
}
