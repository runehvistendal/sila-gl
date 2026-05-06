"use client"

import { useCallback, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import dynamic from "next/dynamic"
import { LayoutGrid, MapPinned } from "lucide-react"
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
import { cabinPinsToMapRoutes, type CabinMapPin } from "@/lib/cabinMapRoutes"

const TransportMap = dynamic(() => import("@/components/map/TransportMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[16rem] items-center justify-center bg-muted">
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        Indlæser kort...
      </div>
    </div>
  ),
})

const REGION_CHIPS = [
  "Nuuk & omegn",
  "Diskobugten",
  "Sydgrønland",
  "Vestgrønland",
  "Østgrønland",
  "Nordgrønland",
  "Diskoøen",
] as const

interface Props {
  cabins: CabinCardData[]
  cabinMapPins: CabinMapPin[]
  initialFilters: FilterValues
}

type LayoutMode = "list" | "map"

export default function HytterClient({ cabins, cabinMapPins, initialFilters }: Props) {
  const t = useTranslations("cabins")
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([])
  const [layoutView, setLayoutView] = useState<LayoutMode>("list")

  const hubRegion = initialFilters.hub
    ? GREENLAND_LOCATIONS.find((l) => l.name_dk === initialFilters.hub)?.region_label ?? null
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
    return cabins.filter((c) => selectedAmenities.every((a) => c.amenities?.includes(a)))
  }, [cabins, selectedAmenities])

  const visiblePins = useMemo(() => {
    const allow = new Set(filteredCabins.map((c) => c.id))
    return cabinMapPins.filter((p) => allow.has(p.id))
  }, [filteredCabins, cabinMapPins])

  const cabinMapRoutes = useMemo(() => cabinPinsToMapRoutes(visiblePins), [visiblePins])

  function toggleLayout() {
    setLayoutView((v) => {
      const next = v === "list" ? "map" : "list"
      captureEvent("filter_applied", {
        type: "hytte",
        filter_key: "layout",
        filter_value: next,
      })
      return next
    })
  }

  return (
    <>
      {/* ── Filter header ── */}
      <div className="bg-card border-b border-border pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t("pageTitle")}</h1>
            <button
              type="button"
              aria-pressed={layoutView === "map"}
              className={cn(
                "rounded-xl h-10 px-3 text-sm font-medium border shadow-sm shrink-0",
                "flex items-center gap-1.5 self-end sm:self-auto whitespace-nowrap transition-colors",
                layoutView === "map"
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-input bg-transparent hover:bg-muted text-foreground",
              )}
              onClick={toggleLayout}
            >
              {layoutView === "list" ? (
                <>
                  <MapPinned size={14} aria-hidden /> {t("view_on_map")}
                </>
              ) : (
                <>
                  <LayoutGrid size={14} aria-hidden /> {t("view_list")}
                </>
              )}
            </button>
          </div>
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

      {/* ── Region-chips + grid / map ── */}
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

        {layoutView === "list" ? (
          <CabinGrid cabins={filteredCabins} total={filteredCabins.length} />
        ) : (
          <div className="h-64 md:h-96 relative rounded-xl overflow-hidden border border-border">
            <TransportMap
              mode="overview"
              routes={cabinMapRoutes}
              className="h-full min-h-[16rem] border-0 rounded-xl"
              analyticsType="cabin"
              onSelect={(id) => router.push(`/hytter/${id}`)}
            />
          </div>
        )}
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
