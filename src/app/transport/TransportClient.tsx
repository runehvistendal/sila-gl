"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Anchor, Grid, Map, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { krToOre } from "@/lib/money"
import TransportCard, { type RideShareCardData } from "./components/TransportCard"
import TransportFilters, { type TransportFilterValues } from "./components/TransportFilters"

const DEFAULT_FILTERS: TransportFilterValues = {
  search:   "",
  fromLoc:  "all",
  toLoc:    "all",
  sort:     "date_asc",
  minDate:  "",
  maxPrice: "",
  minSeats: "",
}

interface Props {
  rideShares: RideShareCardData[]
}

export default function TransportClient({ rideShares }: Props) {
  const [filters, setFilters]   = useState<TransportFilterValues>(DEFAULT_FILTERS)
  const [view, setView]         = useState<"grid" | "map">("grid")
  const [showAll, setShowAll]   = useState(false)

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

      const depDate = rs.departure_at.slice(0, 10) // ISO date part
      const matchDate  = !filters.minDate  || depDate >= filters.minDate
      const matchPrice = !filters.maxPrice || rs.price_per_seat_ore <= krToOre(Number(filters.maxPrice))
      const matchSeats = !filters.minSeats || rs.seats_available >= Number(filters.minSeats)

      return matchSearch && matchFrom && matchTo && matchDate && matchPrice && matchSeats
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
        r.skipper_id    === rs.skipper_id &&
        r.skipper_id    !== null &&
        r.from_location === rs.to_location &&
        r.to_location   === rs.from_location &&
        r.id            !== rs.id
    ) ?? null

  const visible = showAll ? filtered : filtered.slice(0, 9)

  return (
    <div className="min-h-screen pt-16 bg-background">
      {/* ── Header ── */}
      <div className="bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-1">Samsejlads i Grønland</h1>
              <p className="text-muted-foreground">Lokale sejlere tilbyder pladser langs kysten</p>
            </div>
            <div className="flex gap-1 bg-muted rounded-xl p-1">
              <button
                onClick={() => setView("grid")}
                className={`p-2 rounded-lg transition-colors ${view === "grid" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground"}`}
                aria-label="Gittervisning"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView("map")}
                className={`p-2 rounded-lg transition-colors ${view === "map" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground"}`}
                aria-label="Kortvisning"
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
          <div className="text-center py-24 bg-white rounded-2xl border border-dashed border-border">
            <Map className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">Kortvisning kommer snart</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <Anchor className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-lg font-medium text-foreground mb-1">Ingen ruter fundet</p>
            <p className="text-muted-foreground text-sm">Prøv en anden søgning</p>
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
              <Link href="/opret?type=transport">
                Anmod om transport <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
