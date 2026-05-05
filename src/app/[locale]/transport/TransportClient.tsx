"use client"

import { useState, useMemo } from "react"
import dynamic from "next/dynamic"
import { Anchor, Grid, Map, ArrowRight, MessageSquare } from "lucide-react"
import { format } from "date-fns"
import { da, enUS } from "date-fns/locale"
import { useLocale, useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import TransportCard, { type RideShareCardData } from "./components/TransportCard"
import TransportFilters, { type TransportFilterValues } from "./components/TransportFilters"
import type { TransportMapRoute } from "@/components/map/TransportMap"

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

export interface OpenTransportRequest {
  id: string
  from_location: string
  to_location: string
  desired_date: string
  num_passengers: number
  trip_type: string
  status: string
}

const DEFAULT_FILTERS: TransportFilterValues = {
  search:        "",
  fromLoc:       "all",
  toLoc:         "all",
  sort:          "date_asc",
  boatTypes:     [],
  cabin:         "",
  onlyAvailable: true,
  showPanel:     false,
}

// Trip type labels come from translations (see tripTypes in messages)

interface Props {
  rideShares:   RideShareCardData[]
  openRequests: OpenTransportRequest[]
}

export default function TransportClient({ rideShares, openRequests }: Props) {
  const t = useTranslations("transport")
  const locale = useLocale()
  const dateFnsLocale = locale === "en" ? enUS : da
  const [filters, setFilters]   = useState<TransportFilterValues>(DEFAULT_FILTERS)
  const [view, setView]         = useState<"grid" | "map">("grid")
  const [showAll, setShowAll]   = useState(false)
  const [selectedRouteId, setSelectedRouteId] = useState<string | undefined>()

  const filtered = useMemo(() => {
    const q = filters.search.toLowerCase()

    let result = rideShares.filter((rs) => {
      const matchSearch =
        !q ||
        rs.from_location.toLowerCase().includes(q) ||
        rs.to_location.toLowerCase().includes(q) ||
        (rs.profiles?.full_name?.toLowerCase().includes(q) ?? false)

      const matchFrom = filters.fromLoc === "all" || rs.from_location === filters.fromLoc
      const matchTo   = filters.toLoc   === "all" || rs.to_location   === filters.toLoc

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

      return matchSearch && matchFrom && matchTo && matchBoat && matchCabin && matchAvailable
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
  }, [rideShares, filters])

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
          fromName:  rs.from_location,
          fromLat:   loc.from_latitude,
          fromLng:   loc.from_longitude,
          toName:    rs.to_location,
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
              <h1 className="text-3xl font-bold text-foreground mb-1">{t("metaTitle").replace(" — Sila.gl", "")}</h1>
              <p className="text-muted-foreground">{t("metaDescription")}</p>
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
          <TransportFilters filters={filters} onChange={setFilters} />
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
            className="h-[420px] md:h-[520px]"
          />
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <Anchor className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-lg font-medium text-foreground mb-1">{t("noResults")}</p>
            <p className="text-muted-foreground text-sm">{t("clearFilters")}</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-6">
              {filtered.length} rute{filtered.length !== 1 ? "r" : ""} fundet
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {visible.map((rs) => (
                <TransportCard key={rs.id} rideShare={rs} returnTrip={getReturnTrip(rs)} />
              ))}
            </div>
            {!showAll && filtered.length > 9 && (
              <div className="flex justify-center mt-8">
                <Button
                  variant="outline"
                  className="rounded-xl px-6"
                  onClick={() => setShowAll(true)}
                >
                  Vis alle ruter ({filtered.length})
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Åbne transportanmodninger ── */}
      {openRequests.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 border-t border-border">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div>
              <h2 className="text-xl font-bold text-foreground">Åbne transportanmodninger</h2>
              <p className="text-sm text-muted-foreground">Gæster der søger transport — byd ind med et tilbud</p>
            </div>
            <Link
              href="/transport/anmod"
              className="text-sm text-primary font-semibold hover:text-primary/80 flex items-center gap-1"
            >
              Opret ny <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {openRequests.map((r) => (
              <Link
                key={r.id}
                href={`/transport/anmodninger/${r.id}`}
                className="block bg-white rounded-2xl border border-border p-4 hover:shadow-card-hover hover:border-primary/20 transition-all"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                    <Anchor className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                    Åben
                  </span>
                </div>
                <p className="font-semibold text-sm text-foreground">
                  {r.from_location} → {r.to_location}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(r.desired_date), "d. MMM yyyy", { locale: dateFnsLocale })}
                  {" · "}{r.num_passengers} passager{r.num_passengers !== 1 ? "er" : ""}
                  {" · "}{t(`tripTypes.${r.trip_type as "one_way" | "round_trip" | "return"}` as const) ?? r.trip_type}
                </p>
                <div className="flex items-center gap-1 mt-3 text-primary text-xs font-semibold">
                  <MessageSquare className="w-3 h-3" />
                  Se anmodning
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── CTA ── */}
      <section className="py-16 bg-primary/5 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                Kan du ikke finde den rute du søger?
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base max-w-md">
                Anmod om transport — lokale sejlere svarer
              </p>
            </div>
            <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-6 font-semibold gap-2 whitespace-nowrap">
              <Link href="/transport/anmod">
                Anmod om transport <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
