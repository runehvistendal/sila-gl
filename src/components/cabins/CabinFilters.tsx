"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Search, SlidersHorizontal, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { GREENLAND_LOCATIONS } from "@/lib/greenlandLocations"
import { AMENITY_META, AMENITY_FILTER_KEYS } from "@/lib/amenityMeta"

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

interface CabinFiltersProps {
  initialFilters: FilterValues
  selectedAmenities?: string[]
  onAmenityChange?: (keys: string[]) => void
}

export default function CabinFilters({
  initialFilters,
  selectedAmenities = [],
  onAmenityChange,
}: CabinFiltersProps) {
  const router = useRouter()
  const [filters, setFilters] = useState<FilterValues>(initialFilters)
  const [showAdvanced, setShowAdvanced] = useState(
    !!(
      initialFilters.minPrice ||
      initialFilters.maxPrice ||
      initialFilters.transport
    )
  )

  const urlActiveCount =
    (!!filters.hub ? 1 : 0) +
    (!!filters.guests ? 1 : 0) +
    (filters.transport ? 1 : 0) +
    (!!filters.minPrice ? 1 : 0) +
    (!!filters.maxPrice ? 1 : 0) +
    (filters.sort !== "newest" ? 1 : 0)

  const totalActiveCount = urlActiveCount + selectedAmenities.length

  const hasActive = urlActiveCount > 0 || !!filters.search

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

        {/* Filtre-toggle */}
        <button
          type="button"
          className={`rounded-xl h-10 px-3 text-sm font-medium border shadow-sm flex items-center gap-1.5 whitespace-nowrap transition-colors ${
            showAdvanced
              ? "border-primary bg-primary/5 text-primary"
              : "border-input bg-transparent hover:bg-muted text-foreground"
          }`}
          onClick={() => setShowAdvanced((v) => !v)}
        >
          <SlidersHorizontal size={14} />
          Filtre
          {totalActiveCount > 0 && (
            <span className="bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5 leading-none font-semibold">
              {totalActiveCount}
            </span>
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

          {/* ── Faciliteter ── */}
          {onAmenityChange && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Faciliteter
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {AMENITY_FILTER_KEYS.map((key) => {
                  const meta = AMENITY_META[key]
                  const Icon = meta.icon
                  const checked = selectedAmenities.includes(key)
                  return (
                    <label
                      key={key}
                      className={`flex items-center gap-2 text-sm cursor-pointer rounded-xl px-3 py-2 border transition-colors ${
                        checked
                          ? "border-primary bg-primary/5 text-primary font-medium"
                          : "border-border hover:bg-muted text-foreground"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const next = checked
                            ? selectedAmenities.filter((a) => a !== key)
                            : [...selectedAmenities, key]
                          onAmenityChange(next)
                        }}
                        className="sr-only"
                      />
                      <Icon size={14} className="shrink-0" />
                      {meta.label}
                    </label>
                  )
                })}
              </div>
            </div>
          )}

          {(hasActive || selectedAmenities.length > 0) && (
            <button
              type="button"
              onClick={() => {
                reset()
                onAmenityChange?.([])
              }}
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
