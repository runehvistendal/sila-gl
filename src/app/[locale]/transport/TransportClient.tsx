"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import dynamic from "next/dynamic"
import { useSearchParams } from "next/navigation"
import { Anchor, Grid, Map, ArrowRight } from "lucide-react"
import { useTranslations } from "next-intl"
import { Link, useRouter } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import TransportCard, { type RideShareCardData } from "./components/TransportCard"
import TransportFilters, { type TransportFilterValues } from "./components/TransportFilters"
import type { TransportMapRoute } from "@/components/map/TransportMap"
import { captureEvent } from "@/lib/analytics/posthog-events"
import { getLocationName, rideShareKeysForLocationFilter } from "@/lib/greenlandLocations"

function MapLoading() {
  const t = useTranslations("transport")
  return (
    <div className="h-72 rounded-xl border border-border bg-muted flex items-center justify-center">
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        {t("loading")}
      </div>
    </div>
  )
}

const TransportMap = dynamic(() => import("@/components/map/TransportMap"), {
  ssr: false,
  loading: () => <MapLoading />,
})

const DEFAULT_FILTERS: TransportFilterValues = {
  search:        "",
  fromLoc:       "all",
  toLoc:         "all",
  sort:          "date_asc",
  boatTypes:     [],
  cabin:         "",
  onlyAvailable: true,
  date:          "",
  showPanel:     false,
}

interface Props {
  rideShares:   RideShareCardData[]
  initialDate?: string
  initialHub?: string
  /** Min. ledige pladser (fra ?guests=); 0 = ingen filtrering */
  initialGuests?: number
}

export default function TransportClient({
  rideShares,
  initialDate = "",
  initialHub = "",
  initialGuests = 0,
}: Props) {
  const t = useTranslations("transport")
  const router = useRouter()
  const searchParams = useSearchParams()

  const hubForFilter = initialHub.trim() || null

  const [localFilters, setLocalFilters] = useState<TransportFilterValues>(() => ({
    ...DEFAULT_FILTERS,
    fromLoc: hubForFilter ?? "all",
  }))

  useEffect(() => {
    const h = initialHub.trim()
    setLocalFilters((f) => ({
      ...f,
      fromLoc: h ? h : "all",
    }))
  }, [initialHub])

  const filters = useMemo<TransportFilterValues>(
    () => ({ ...localFilters, date: initialDate }),
    [localFilters, initialDate],
  )
  const [view, setView]         = useState<"grid" | "map">("grid")
  const [showAll, setShowAll]   = useState(false)
  const [selectedRouteId, setSelectedRouteId] = useState<string | undefined>()

  function pushDateToUrl(nextDate: string) {
    const p = new URLSearchParams(searchParams.toString())
    if (nextDate) p.set("date", nextDate)
    else p.delete("date")
    const qs = p.toString()
    router.push(`/transport${qs ? `?${qs}` : ""}`)
  }

  function handleFiltersChange(next: TransportFilterValues) {
    if (next.date !== initialDate) {
      pushDateToUrl(next.date)
    }
    setLocalFilters({ ...next, date: "" })
  }

  const filtered = useMemo(() => {
    const q = filters.search.toLowerCase()

    let result = rideShares.filter((rs) => {
      const matchSearch =
        !q ||
        rs.from_location.toLowerCase().includes(q) ||
        rs.to_location.toLowerCase().includes(q) ||
        (rs.profiles?.full_name?.toLowerCase().includes(q) ?? false)

      const fromKeys = rideShareKeysForLocationFilter(
        filters.fromLoc === "all" ? "" : filters.fromLoc,
      )
      const toKeys = rideShareKeysForLocationFilter(
        filters.toLoc === "all" ? "" : filters.toLoc,
      )

      const matchFrom =
        !fromKeys || fromKeys.has(rs.from_location.toLowerCase())
      const matchTo =
        !toKeys || toKeys.has(rs.to_location.toLowerCase())

      const boatDesc = (rs.boat_description ?? "").toLowerCase()
      const matchBoat = filters.boatTypes.length === 0 || filters.boatTypes.some((bt) => {
        if (bt === "fiskerbåd") return boatDesc.includes("fiskerbåd") || boatDesc.includes("fiskekutter")
        return boatDesc.includes(bt)
      })

      const hasCabin = boatDesc.includes("kabine")
      const matchCabin =
        filters.cabin === "" ||
        (filters.cabin === "with" && hasCabin) ||
        (filters.cabin === "without" && !hasCabin)

      const matchAvailable = !filters.onlyAvailable || rs.seats_available > 0

      const matchGuests =
        initialGuests < 1 || rs.seats_available >= initialGuests

      return (
        matchSearch &&
        matchFrom &&
        matchTo &&
        matchBoat &&
        matchCabin &&
        matchAvailable &&
        matchGuests
      )
    })

    if (filters.sort === "price_asc") {
      result = [...result].sort((a, b) => a.price_per_seat_ore - b.price_per_seat_ore)
    } else {
      // date_asc (default)
      result = [...result].sort(
        (a, b) => new Date(a.departure_at).getTime() - new Date(b.departure_at).getTime()
      )
    }

    return result
  }, [rideShares, filters, initialGuests])

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {
      const loc =
        filters.fromLoc !== "all" || filters.toLoc !== "all"
          ? `${filters.fromLoc === "all" ? "" : filters.fromLoc}>${filters.toLoc === "all" ? "" : filters.toLoc}`
          : ""
      captureEvent("search_performed", {
        type: "transport",
        location: loc,
        check_in: filters.date,
        check_out: "",
        guests: initialGuests >= 1 ? String(initialGuests) : "",
      })
    }, 450)
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    }
  }, [filters, initialGuests])

  function handleFilterApplied(key: string, value: string | boolean | string[]) {
    captureEvent("filter_applied", {
      type: "transport",
      filter_key: key,
      filter_value: Array.isArray(value) ? value.join(",") : String(value),
    })
  }

  const getReturnTrip = (rs: RideShareCardData): RideShareCardData | null =>
    rideShares.find(
      (r) =>
        r.sejler_id     === rs.sejler_id &&
        r.sejler_id     !== null &&
        r.from_location === rs.to_location &&
        r.to_location   === rs.from_location &&
        r.id            !== rs.id
    ) ?? null

  const visible = showAll ? filtered : filtered.slice(0, 9)

  const mapRoutes = useMemo<TransportMapRoute[]>(() =>
    filtered
      .filter((rs) => {
        const loc = rs as RideShareCardData & { from_latitude?: number; from_longitude?: number; to_latitude?: number; to_longitude?: number }
        return loc.from_latitude && loc.from_longitude && loc.to_latitude && loc.to_longitude
      })
      .map((rs) => {
        const loc = rs as RideShareCardData & { from_latitude: number; from_longitude: number; to_latitude: number; to_longitude: number }
        return {
          id:        rs.id,
          fromName:  getLocationName(rs.from_location),
          fromLat:   loc.from_latitude,
          fromLng:   loc.from_longitude,
          toName:    getLocationName(rs.to_location),
          toLat:     loc.to_latitude,
          toLng:     loc.to_longitude,
          meta: {
            departure:      rs.departure_at,
            seatsAvailable: rs.seats_available,
            priceOre:       rs.price_per_seat_ore,
            skipperName:    rs.profiles?.full_name ?? undefined,
          },
        }
      }),
  [filtered])

  return (
    <div className="min-h-screen pt-16 bg-background">
      {/* ── Header ── */}
      <div className="bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-1">{t("pageTitle")}</h1>
              <p className="text-muted-foreground">{t("pageSubtitle")}</p>
            </div>
            <div className="flex gap-1 bg-muted rounded-xl p-1">
              <button
                onClick={() => setView("grid")}
                className={`p-2 rounded-lg transition-colors ${view === "grid" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground"}`}
                aria-label={t("views.grid")}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView("map")}
                className={`p-2 rounded-lg transition-colors ${view === "map" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground"}`}
                aria-label={t("views.map")}
              >
                <Map className="w-4 h-4" />
              </button>
            </div>
          </div>
          <TransportFilters
            filters={filters}
            onChange={handleFiltersChange}
            onFilterApplied={handleFilterApplied}
          />
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {view === "map" ? (
          <TransportMap
            routes={mapRoutes}
            mode="overview"
            selectedId={selectedRouteId}
            onSelect={(id) => {
              setSelectedRouteId(id)
              setView("grid")
            }}
            analyticsType="transport"
            className="h-[420px] md:h-[520px]"
          />
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <Anchor className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-lg font-medium text-foreground mb-1">{t("noResults")}</p>
            <p className="text-muted-foreground text-sm">{t("tryNewSearch")}</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-6">
              {t(filtered.length === 1 ? "routesFound_one" : "routesFound_other", { count: filtered.length })}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {visible.map((rs, idx) => (
                <TransportCard key={rs.id} rideShare={rs} returnTrip={getReturnTrip(rs)} resultIndex={idx} />
              ))}
            </div>
            {!showAll && filtered.length > 9 && (
              <div className="flex justify-center mt-8">
                <Button
                  variant="outline"
                  className="rounded-xl px-6"
                  onClick={() => setShowAll(true)}
                >
                  {t("showAllRoutes", { count: filtered.length })}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── CTA ── */}
      <section className="py-16 bg-primary/5 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                {t("ctaTitle")}
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base max-w-md">
                {t("ctaSubtitle")}
              </p>
            </div>
            <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-6 font-semibold gap-2 whitespace-nowrap">
              <Link href="/transport/anmod">
                {t("ctaButton")} <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
