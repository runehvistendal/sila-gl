"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { format } from "date-fns"
import { da } from "date-fns/locale"
import { Anchor, Users, ArrowRight, PlusCircle, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { GREENLAND_LOCATIONS } from "@/lib/greenlandLocations"
import { formatKr } from "@/lib/money"
import type { RideShareCardData } from "./page"

const SamsejladsOversigt = dynamic(() => import("@/components/map/SamsejladsOversigt"), {
  ssr: false,
  loading: () => (
    <div className="h-56 rounded-xl border border-white/10 bg-[#09192A]/60 flex items-center justify-center">
      <div className="flex items-center gap-2 text-white/50 text-sm">
        <div className="w-4 h-4 border-2 border-[#4A9CC7]/40 border-t-[#4A9CC7] rounded-full animate-spin" />
        Indlæser kort...
      </div>
    </div>
  ),
})

const HUBS = GREENLAND_LOCATIONS.filter((l) => l.is_major_hub)
const ALL_LOCATIONS = [...HUBS, ...GREENLAND_LOCATIONS.filter((l) => !l.is_major_hub)]

function RideShareCard({ rs }: { rs: RideShareCardData }) {
  const departure = new Date(rs.departure_at)
  const isFull = rs.status === "full" || rs.seats_available === 0

  return (
    <Link href={`/samsejlads/${rs.id}`} className="group block">
      <div className="bg-white rounded-2xl border border-border hover:border-primary/40 hover:shadow-md transition-all duration-200 p-5">
        {/* Route */}
        <div className="flex items-center gap-2 mb-3">
          <span className="font-bold text-foreground text-base">{rs.from_location}</span>
          <ArrowRight className="w-4 h-4 text-primary shrink-0" />
          <span className="font-bold text-foreground text-base">{rs.to_location}</span>
          {isFull && (
            <Badge className="ml-auto bg-gray-100 text-gray-500 border-0 text-xs">Fuldt booket</Badge>
          )}
        </div>

        {/* Date + seats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <span>{format(departure, "d. MMM yyyy", { locale: da })}</span>
          <span className="text-muted-foreground/40">•</span>
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {rs.seats_available} ledig{rs.seats_available !== 1 ? "e" : ""} plads{rs.seats_available !== 1 ? "er" : ""}
          </span>
        </div>

        {/* Sejler + price */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
              {rs.profiles?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={rs.profiles.avatar_url}
                  alt={rs.profiles.full_name ?? "Sejler"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-3.5 h-3.5 text-primary/60" />
              )}
            </div>
            <span className="text-sm text-muted-foreground truncate">
              {rs.profiles?.full_name ?? "Sila-sejler"}
            </span>
          </div>
          <div className="text-right shrink-0">
            <p className="font-bold text-foreground text-sm">{formatKr(rs.price_per_seat_ore)}</p>
            <p className="text-xs text-muted-foreground">pr. plads</p>
          </div>
        </div>

        {rs.boat_description && (
          <p className="text-xs text-muted-foreground mt-3 truncate">{rs.boat_description}</p>
        )}
      </div>
    </Link>
  )
}

export default function SamsejladsClient({ rideShares }: { rideShares: RideShareCardData[] }) {
  const [fromFilter, setFromFilter] = useState("")
  const [toFilter, setToFilter] = useState("")
  const [dateFilter, setDateFilter] = useState("")
  const [seatsFilter, setSeatsFilter] = useState(1)

  const filtered = useMemo(() => {
    return rideShares.filter((rs) => {
      if (fromFilter && rs.from_location !== fromFilter) return false
      if (toFilter && rs.to_location !== toFilter) return false
      if (seatsFilter > 1 && rs.seats_available < seatsFilter) return false
      if (dateFilter) {
        const dep = rs.departure_at.slice(0, 10)
        if (dep < dateFilter) return false
      }
      return true
    })
  }, [rideShares, fromFilter, toFilter, dateFilter, seatsFilter])

  const todayStr = new Date().toISOString().slice(0, 10)

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-[#09192A] pt-24 pb-12 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-white/80 text-sm mb-4">
            <Anchor className="w-3.5 h-3.5" />
            Samsejlads
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            Rejs med lokale sejlere
          </h1>
          <p className="text-white/70 text-base max-w-lg mx-auto">
            Find ledige pladser på sejlture langs Grønlands kyst.
          </p>
          <Link href="/samsejlads/opret" className="mt-6 inline-block">
            <Button className="bg-[#4A9CC7] hover:bg-[#4A9CC7]/90 text-white gap-2 rounded-xl">
              <PlusCircle className="w-4 h-4" />
              Tilbyd transport
            </Button>
          </Link>
        </div>
      </div>

      {/* Overview map */}
      {rideShares.length > 0 && (
        <div className="max-w-5xl mx-auto px-4 -mt-4 mb-0 relative z-10">
          <SamsejladsOversigt
            rideShares={rideShares.filter((rs) => rs.status === "active")}
            className="h-56"
          />
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="bg-white rounded-2xl border border-border p-4 mb-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Fra</label>
            <select
              value={fromFilter}
              onChange={(e) => setFromFilter(e.target.value)}
              className="w-full text-sm bg-muted rounded-lg px-3 py-2 border-0 focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Alle steder</option>
              {ALL_LOCATIONS.map((l) => (
                <option key={l.postal_code} value={l.name_dk}>{l.name_dk}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Til</label>
            <select
              value={toFilter}
              onChange={(e) => setToFilter(e.target.value)}
              className="w-full text-sm bg-muted rounded-lg px-3 py-2 border-0 focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Alle steder</option>
              {ALL_LOCATIONS.map((l) => (
                <option key={l.postal_code} value={l.name_dk}>{l.name_dk}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Dato (fra)</label>
            <input
              type="date"
              value={dateFilter}
              min={todayStr}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full text-sm bg-muted rounded-lg px-3 py-2 border-0 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Pladser</label>
            <select
              value={seatsFilter}
              onChange={(e) => setSeatsFilter(Number(e.target.value))}
              className="w-full text-sm bg-muted rounded-lg px-3 py-2 border-0 focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n} value={n}>{n}+</option>
              ))}
            </select>
          </div>
        </div>

        {/* Results */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            {filtered.length === 0
              ? "Ingen ture fundet"
              : `${filtered.length} tur${filtered.length !== 1 ? "e" : ""}`}
          </p>
          {(fromFilter || toFilter || dateFilter || seatsFilter > 1) && (
            <button
              type="button"
              onClick={() => { setFromFilter(""); setToFilter(""); setDateFilter(""); setSeatsFilter(1) }}
              className="text-xs text-primary hover:underline"
            >
              Ryd filtre
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Anchor className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" strokeWidth={1.5} />
            <p className="font-medium mb-1">Ingen tilgængelige ture</p>
            <p className="text-sm mb-6">Prøv andre filtreringskriterier eller tilbyd en tur selv.</p>
            <Link href="/samsejlads/opret">
              <Button variant="outline" className="gap-2 rounded-xl">
                <PlusCircle className="w-4 h-4" />
                Tilbyd transport
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((rs) => (
              <RideShareCard key={rs.id} rs={rs} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
