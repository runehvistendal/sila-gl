"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Search, SlidersHorizontal, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { GREENLAND_LOCATIONS } from "@/lib/greenlandLocations"

const CITIES = [...new Set(GREENLAND_LOCATIONS.map((l) => l.name_dk))].sort()

const SELECT_CLS =
  "h-10 rounded-xl border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring text-foreground cursor-pointer"

export interface FilterValues {
  hub: string
  guests: string
  transport: boolean
  minPrice: string
  maxPrice: string
  sort: string
  search: string
}

const DEFAULT: FilterValues = {
  hub: "",
  guests: "",
  transport: false,
  minPrice: "",
  maxPrice: "",
  sort: "newest",
  search: "",
}

export default function CabinFilters({
  initialFilters,
}: {
  initialFilters: FilterValues
}) {
  const router = useRouter()
  const [filters, setFilters] = useState<FilterValues>(initialFilters)
  const [showAdvanced, setShowAdvanced] = useState(
    !!(
      initialFilters.minPrice ||
      initialFilters.maxPrice ||
      initialFilters.transport
    )
  )

  const hasActive =
    !!filters.hub ||
    !!filters.guests ||
    filters.transport ||
    !!filters.minPrice ||
    !!filters.maxPrice ||
    filters.sort !== "newest" ||
    !!filters.search

  const push = useCallback(
    (next: FilterValues) => {
      const p = new URLSearchParams()
      if (next.search)    p.set("search",    next.search)
      if (next.hub)       p.set("hub",       next.hub)
      if (next.guests)    p.set("guests",    next.guests)
      if (next.transport) p.set("transport", "true")
      if (next.minPrice)  p.set("minPrice",  next.minPrice)
      if (next.maxPrice)  p.set("maxPrice",  next.maxPrice)
      if (next.sort !== "newest") p.set("sort", next.sort)
      const qs = p.toString()
      router.push(`/hytter${qs ? `?${qs}` : ""}`)
    },
    [router]
  )

  function set<K extends keyof FilterValues>(key: K, val: FilterValues[K]) {
    const next = { ...filters, [key]: val }
    setFilters(next)
    // Debounce text search — push immediately for selects/toggles
    if (key !== "search") push(next)
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    push(filters)
  }

  function reset() {
    const next = { ...DEFAULT }
    setFilters(next)
    router.push("/hytter")
  }

  return (
    <div className="space-y-3">
      {/* Row 1: search + location + sort + advanced toggle */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        {/* Search */}
        <form
          onSubmit={handleSearchSubmit}
          className="relative flex-1 min-w-[180px] max-w-xs"
        >
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <Input
            placeholder="Søg hytter..."
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            onBlur={() => push(filters)}
            className="pl-10 h-10 rounded-xl"
          />
        </form>

        {/* Location */}
        <select
          value={filters.hub}
          onChange={(e) => set("hub", e.target.value)}
          className={`${SELECT_CLS} w-full sm:w-[180px]`}
        >
          <option value="">Alle destinationer</option>
          {CITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {/* Sort */}
        <select
          value={filters.sort}
          onChange={(e) => set("sort", e.target.value)}
          className={`${SELECT_CLS} w-full sm:w-[160px]`}
        >
          <option value="newest">Nyeste først</option>
          <option value="price_asc">Pris: lav → høj</option>
          <option value="price_desc">Pris: høj → lav</option>
        </select>

        {/* Advanced toggle */}
        <button
          type="button"
          className="rounded-xl h-10 px-3 text-sm font-medium border border-input bg-transparent shadow-sm hover:bg-muted flex items-center gap-1.5 whitespace-nowrap"
          onClick={() => setShowAdvanced((v) => !v)}
        >
          <SlidersHorizontal size={14} />
          Filtre
          {hasActive && (
            <span className="w-2 h-2 rounded-full bg-primary inline-block" />
          )}
        </button>
      </div>

      {/* Advanced panel */}
      {showAdvanced && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                Min pris (kr/nat)
              </label>
              <Input
                type="number"
                placeholder="0"
                min={0}
                value={filters.minPrice}
                onChange={(e) => set("minPrice", e.target.value)}
                className="rounded-xl h-9"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                Maks pris (kr/nat)
              </label>
              <Input
                type="number"
                placeholder="∞"
                min={0}
                value={filters.maxPrice}
                onChange={(e) => set("maxPrice", e.target.value)}
                className="rounded-xl h-9"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                Min gæster
              </label>
              <Input
                type="number"
                placeholder="1"
                min={1}
                value={filters.guests}
                onChange={(e) => set("guests", e.target.value)}
                className="rounded-xl h-9"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={filters.transport}
              onChange={(e) => set("transport", e.target.checked)}
              className="w-4 h-4 accent-primary rounded"
            />
            <span className="font-medium text-foreground">
              Transport til hytten inkluderet
            </span>
          </label>

          {hasActive && (
            <button
              type="button"
              onClick={reset}
              className="text-muted-foreground text-sm flex items-center gap-1 h-8 px-2 rounded-lg hover:bg-muted"
            >
              <X size={14} /> Nulstil filtre
            </button>
          )}
        </div>
      )}
    </div>
  )
}
