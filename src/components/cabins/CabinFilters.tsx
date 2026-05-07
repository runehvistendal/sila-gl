"use client"

import { useState, useCallback } from "react"
import { useRouter } from "@/i18n/navigation"
import { useTranslations } from "next-intl"
import { Search, SlidersHorizontal, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import LocationAutocomplete from "@/components/shared/LocationAutocomplete"
import DatePickerButton from "@/components/shared/DatePickerButton"
import {
  AMENITY_META,
  AMENITY_FILTER_KEYS,
  RESIDENCE_AMENITY_FILTER_KEYS,
} from "@/lib/amenityMeta"
import { captureEvent } from "@/lib/analytics/posthog-events"

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
  checkIn: string
  checkOut: string
  residenceSubtype: string
  locationSubtype: string
}

const DEFAULT: FilterValues = {
  hub: "",
  guests: "",
  transport: false,
  minPrice: "",
  maxPrice: "",
  sort: "newest",
  search: "",
  checkIn: "",
  checkOut: "",
  residenceSubtype: "",
  locationSubtype: "",
}

export type ListingKind = "cabin" | "residence"

interface CabinFiltersProps {
  initialFilters: FilterValues
  selectedAmenities?: string[]
  onAmenityChange?: (keys: string[]) => void
  /** Liste-side uten locale-prefix, fx /ophold/i-naturen */
  filterBasePath: string
  listingKind?: ListingKind
}

export default function CabinFilters({
  initialFilters,
  selectedAmenities = [],
  onAmenityChange,
  filterBasePath,
  listingKind = "cabin",
}: CabinFiltersProps) {
  const router = useRouter()
  const tHero = useTranslations("home.heroSearch")
  const tFilters = useTranslations("ophold.filters")
  const tAmenity = useTranslations("amenities.residence")
  const [filters, setFilters] = useState<FilterValues>(initialFilters)
  const [showAdvanced, setShowAdvanced] = useState(
    !!(
      initialFilters.minPrice ||
      initialFilters.maxPrice ||
      initialFilters.transport ||
      (listingKind === "residence" &&
        (initialFilters.residenceSubtype || initialFilters.locationSubtype))
    ),
  )

  const amenityKeys =
    listingKind === "residence" ? RESIDENCE_AMENITY_FILTER_KEYS : AMENITY_FILTER_KEYS

  const filterAnalyticsType = listingKind === "residence" ? "residence" : "hytte"

  const urlActiveCount =
    (!!filters.hub ? 1 : 0) +
    (!!filters.guests ? 1 : 0) +
    (filters.transport ? 1 : 0) +
    (!!filters.minPrice ? 1 : 0) +
    (!!filters.maxPrice ? 1 : 0) +
    (!!filters.checkIn ? 1 : 0) +
    (!!filters.checkOut ? 1 : 0) +
    (filters.sort !== "newest" ? 1 : 0) +
    (listingKind === "residence" && !!filters.residenceSubtype ? 1 : 0) +
    (listingKind === "residence" && !!filters.locationSubtype ? 1 : 0)

  const totalActiveCount = urlActiveCount + selectedAmenities.length

  const hasActive = urlActiveCount > 0 || !!filters.search

  const push = useCallback(
    (next: FilterValues) => {
      captureEvent("search_performed", {
        type: filterAnalyticsType,
        location: next.hub ?? "",
        check_in: next.checkIn ?? "",
        check_out: next.checkOut ?? "",
        guests: next.guests ?? "",
      })
      const p = new URLSearchParams()
      if (next.search) p.set("search", next.search)
      if (next.hub) p.set("hub", next.hub)
      if (next.guests) p.set("guests", next.guests)
      if (next.transport) p.set("transport", "true")
      if (next.minPrice) p.set("minPrice", next.minPrice)
      if (next.maxPrice) p.set("maxPrice", next.maxPrice)
      if (next.checkIn) p.set("checkIn", next.checkIn)
      if (next.checkOut && next.checkOut > (next.checkIn || "")) {
        p.set("checkOut", next.checkOut)
      }
      if (next.sort !== "newest") p.set("sort", next.sort)
      if (listingKind === "residence" && next.residenceSubtype) {
        p.set("residenceSubtype", next.residenceSubtype)
      }
      if (listingKind === "residence" && next.locationSubtype) {
        p.set("locationSubtype", next.locationSubtype)
      }
      const qs = p.toString()
      router.push(`${filterBasePath}${qs ? `?${qs}` : ""}`)
    },
    [router, filterBasePath, listingKind, filterAnalyticsType],
  )

  function set<K extends keyof FilterValues>(key: K, val: FilterValues[K]) {
    let next: FilterValues = { ...filters, [key]: val }
    if (key === "checkIn" && typeof val === "string") {
      if (next.checkOut && next.checkOut <= val) {
        next = { ...next, checkOut: "" }
      }
    }
    setFilters(next)
    captureEvent("filter_applied", {
      type: filterAnalyticsType,
      filter_key: key,
      filter_value:
        typeof val === "boolean" ? String(val) : val === undefined ? "" : String(val),
    })
    if (key !== "search") push(next)
  }

  function applyDateRange(checkIn: string, checkOut: string) {
    let next: FilterValues = { ...filters, checkIn, checkOut }
    if (!checkIn) next = { ...next, checkOut: "" }
    if (checkIn && next.checkOut && next.checkOut <= checkIn) {
      next = { ...next, checkOut: "" }
    }
    setFilters(next)
    captureEvent("filter_applied", {
      type: filterAnalyticsType,
      filter_key: "dates",
      filter_value: `${checkIn}|${next.checkOut}`,
    })
    push(next)
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    push(filters)
  }

  function reset() {
    const next = { ...DEFAULT }
    setFilters(next)
    router.push(filterBasePath)
  }

  function amenityLabel(key: string): string {
    if (listingKind === "residence") {
      try {
        return tAmenity(key)
      } catch {
        /* fallback */
      }
    }
    return AMENITY_META[key]?.label ?? key
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <form
          onSubmit={handleSearchSubmit}
          className="relative flex-1 min-w-[180px] max-w-xs"
        >
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <Input
            placeholder={
              listingKind === "residence"
                ? tFilters("search_residences")
                : tFilters("search_cabins")
            }
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            onBlur={() => push(filters)}
            className="pl-10 h-10 rounded-xl"
          />
        </form>

        <LocationAutocomplete
          value={filters.hub}
          onChange={(name_dk) => set("hub", name_dk)}
          placeholder={tFilters("all_destinations")}
          className="w-full sm:w-[min(100%,14rem)]"
          aria-label="Destination"
          showOptionMeta={false}
        />

        <DatePickerButton
          mode="range"
          checkIn={filters.checkIn}
          checkOut={filters.checkOut}
          placeholder={tHero("datesPlaceholder")}
          aria-label={tHero("datesPlaceholder")}
          onRangeChange={applyDateRange}
          className="w-full shrink-0 basis-full sm:basis-auto sm:w-auto"
        />

        <select
          value={filters.sort}
          onChange={(e) => set("sort", e.target.value)}
          className={`${SELECT_CLS} w-full sm:w-[160px]`}
        >
          <option value="newest">{tFilters("sort_newest")}</option>
          <option value="price_asc">{tFilters("sort_price_asc")}</option>
          <option value="price_desc">{tFilters("sort_price_desc")}</option>
        </select>

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
          {tFilters("filters_toggle")}
          {totalActiveCount > 0 && (
            <span className="bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5 leading-none font-semibold">
              {totalActiveCount}
            </span>
          )}
        </button>
      </div>

      {showAdvanced && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          {listingKind === "residence" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                  {tFilters("residence_type")}
                </label>
                <select
                  value={filters.residenceSubtype}
                  onChange={(e) => set("residenceSubtype", e.target.value)}
                  className={`${SELECT_CLS} w-full`}
                >
                  <option value="">{tFilters("any_residence_type")}</option>
                  <option value="house">{tFilters("subtype_house")}</option>
                  <option value="apartment">{tFilters("subtype_apartment")}</option>
                  <option value="room">{tFilters("subtype_room")}</option>
                  <option value="other">{tFilters("subtype_other")}</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                  {tFilters("location_setting")}
                </label>
                <select
                  value={filters.locationSubtype}
                  onChange={(e) => set("locationSubtype", e.target.value)}
                  className={`${SELECT_CLS} w-full`}
                >
                  <option value="">{tFilters("any_location_setting")}</option>
                  <option value="city">{tFilters("loc_city")}</option>
                  <option value="village">{tFilters("loc_village")}</option>
                </select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                {tFilters("min_price")}
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
                {tFilters("max_price")}
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
                {tFilters("min_guests")}
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
              {listingKind === "residence"
                ? tFilters("offers_transfer")
                : tFilters("transport_to_listing")}
            </span>
          </label>

          {onAmenityChange && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {tFilters("amenities_heading")}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {amenityKeys.map((key) => {
                  const meta = AMENITY_META[key]
                  if (!meta) return null
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
                      {amenityLabel(key)}
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
              <X size={14} /> {tFilters("reset_filters")}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export { DEFAULT as DEFAULT_FILTER_VALUES }
