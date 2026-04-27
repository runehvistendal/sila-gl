"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Search, SlidersHorizontal, X } from "lucide-react"
import { GREENLAND_LOCATIONS } from "@/lib/greenlandLocations"

const CITIES = [...new Set(GREENLAND_LOCATIONS.map((l) => l.name_dk))].sort()

export interface TransportFilterValues {
  search:   string
  fromLoc:  string
  toLoc:    string
  sort:     string
  minDate:  string
  maxPrice: string
  minSeats: string
}

interface Props {
  filters: TransportFilterValues
  onChange: (f: TransportFilterValues) => void
}

export default function TransportFilters({ filters, onChange }: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  const set = (key: keyof TransportFilterValues, val: string) =>
    onChange({ ...filters, [key]: val })

  const hasActive =
    filters.fromLoc  !== "all" ||
    filters.toLoc    !== "all" ||
    filters.minDate  !== ""    ||
    filters.maxPrice !== ""    ||
    filters.minSeats !== ""

  const reset = () =>
    onChange({
      search:   filters.search,
      fromLoc:  "all",
      toLoc:    "all",
      sort:     "date_asc",
      minDate:  "",
      maxPrice: "",
      minSeats: "",
    })

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Søg rute eller by..."
            value={filters.search}
            onChange={(e) => set("search", e.target.value)}
            className="pl-10 h-10 rounded-xl"
          />
        </div>

        <Select value={filters.fromLoc} onValueChange={(v) => set("fromLoc", v)}>
          <SelectTrigger className="w-[160px] h-10 rounded-xl">
            <SelectValue placeholder="Alle afgange" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle afgange</SelectItem>
            {CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filters.toLoc} onValueChange={(v) => set("toLoc", v)}>
          <SelectTrigger className="w-[160px] h-10 rounded-xl">
            <SelectValue placeholder="Alle destinationer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle destinationer</SelectItem>
            {CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          className="rounded-xl h-10 gap-1.5"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Avanceret
          {hasActive && <span className="w-2 h-2 rounded-full bg-primary inline-block" />}
        </Button>
      </div>

      {showAdvanced && (
        <div className="bg-white border border-border rounded-2xl p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                Tidligste dato
              </label>
              <Input
                type="date"
                value={filters.minDate}
                onChange={(e) => set("minDate", e.target.value)}
                className="rounded-xl h-9"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                Maks. pris/plads (kr.)
              </label>
              <Input
                type="number"
                placeholder="∞"
                value={filters.maxPrice}
                onChange={(e) => set("maxPrice", e.target.value)}
                className="rounded-xl h-9"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                Min. ledige pladser
              </label>
              <Input
                type="number"
                placeholder="1"
                min={1}
                value={filters.minSeats}
                onChange={(e) => set("minSeats", e.target.value)}
                className="rounded-xl h-9"
              />
            </div>
          </div>

          {hasActive && (
            <Button variant="ghost" size="sm" onClick={reset} className="text-muted-foreground gap-1 h-8">
              <X className="w-3.5 h-3.5" /> Nulstil filtre
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
