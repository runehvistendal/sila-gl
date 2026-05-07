"use client"

import { useRef, useEffect } from "react"
import { useTranslations } from "next-intl"
import { Input } from "@/components/ui/input"
import { Search, SlidersHorizontal, X } from "lucide-react"
import LocationAutocomplete from "@/components/shared/LocationAutocomplete"
import DatePickerButton from "@/components/shared/DatePickerButton"

export interface TransportFilterValues {
  search:        string
  fromLoc:       string
  toLoc:         string
  sort:          string
  boatTypes:     string[]   // multi-select
  cabin:         string     // "" | "with" | "without"
  onlyAvailable: boolean
  date:          string     // YYYY-MM-DD
  showPanel:     boolean
}

interface Props {
  filters:  TransportFilterValues
  onChange: (f: TransportFilterValues) => void
  /** Analytics: invoked after each filter change */
  onFilterApplied?: (key: string, value: string | boolean | string[]) => void
}

const BOAT_TYPE_OPTIONS = [
  { value: "speedbåd",  label: "Speedbåd" },
  { value: "fiskerbåd", label: "Fiskerbåd" },
  { value: "rib",       label: "RIB" },
  { value: "katamaran", label: "Katamaran" },
  { value: "motorbåd",  label: "Motorbåd" },
]

export default function TransportFilters({ filters, onChange, onFilterApplied }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  const tHome = useTranslations("home")

  const set = <K extends keyof TransportFilterValues>(key: K, val: TransportFilterValues[K]) => {
    onChange({ ...filters, [key]: val })
    onFilterApplied?.(key, val as unknown as string | boolean | string[])
  }

  function toggleBoatType(val: string) {
    const next = filters.boatTypes.includes(val)
      ? filters.boatTypes.filter((t) => t !== val)
      : [...filters.boatTypes, val]
    onChange({ ...filters, boatTypes: next })
    onFilterApplied?.("boatTypes", next)
  }

  function resetFilters() {
    onChange({
      ...filters,
      boatTypes:     [],
      cabin:         "",
      onlyAvailable: true,
      date:          "",
      showPanel:     false,
    })
    onFilterApplied?.("reset", true)
  }

  // Close on outside click
  useEffect(() => {
    if (!filters.showPanel) return
    function onClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        set("showPanel", false)
      }
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.showPanel])

  const activeCount =
    filters.boatTypes.length +
    (filters.cabin !== "" ? 1 : 0) +
    (filters.onlyAvailable ? 0 : 1) + // "off" is non-default → count it
    (filters.date ? 1 : 0)

  return (
    <div className="space-y-3">
      {/* ── Rad 1: søg + fra/til + Filtrer-knap ── */}
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

        <LocationAutocomplete
          value={filters.fromLoc === "all" ? "" : filters.fromLoc}
          onChange={(name_dk) => set("fromLoc", name_dk || "all")}
          placeholder="Alle afgange"
          className="w-full min-w-0 sm:w-[min(100%,11rem)]"
          aria-label="Afgangsted"
          showOptionMeta={false}
        />

        <LocationAutocomplete
          value={filters.toLoc === "all" ? "" : filters.toLoc}
          onChange={(name_dk) => set("toLoc", name_dk || "all")}
          placeholder="Alle destinationer"
          className="w-full min-w-0 sm:w-[min(100%,11rem)]"
          aria-label="Destination"
          showOptionMeta={false}
        />

        <DatePickerButton
          mode="single"
          date={filters.date}
          placeholder={tHome("searchDates.departure")}
          aria-label={tHome("searchDates.departure")}
          onDateChange={(d) => set("date", d)}
          className="w-full shrink-0 basis-full sm:basis-auto sm:w-auto"
        />

        {/* Filtrer-knap */}
        <div className="relative" ref={panelRef}>
          <button
            type="button"
            className={`rounded-xl h-10 px-3 text-sm font-medium border shadow-sm flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              filters.showPanel
                ? "border-primary bg-primary/5 text-primary"
                : "border-input bg-transparent hover:bg-muted text-foreground"
            }`}
            onClick={() => set("showPanel", !filters.showPanel)}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filtrer
            {activeCount > 0 && (
              <span className="bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5 leading-none font-semibold">
                {activeCount}
              </span>
            )}
          </button>

          {filters.showPanel && (
            <div className="absolute right-0 top-12 z-50 w-72 bg-card border border-border rounded-2xl shadow-lg p-5 space-y-5">

              {/* Bådtype */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Bådtype
                </p>
                <div className="space-y-1.5">
                  {BOAT_TYPE_OPTIONS.map((bt) => (
                    <label
                      key={bt.value}
                      className="flex items-center gap-2.5 text-sm cursor-pointer py-0.5"
                    >
                      <input
                        type="checkbox"
                        checked={filters.boatTypes.includes(bt.value)}
                        onChange={() => toggleBoatType(bt.value)}
                        className="w-4 h-4 accent-primary rounded"
                      />
                      {bt.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Kabine */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Kabine
                </p>
                <div className="flex gap-2 flex-wrap">
                  {(["", "with", "without"] as const).map((val) => {
                    const label = val === "" ? "Alle" : val === "with" ? "Med kabine" : "Uden kabine"
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => set("cabin", val)}
                        className={`h-8 px-3 rounded-full text-xs font-medium border transition-colors ${
                          filters.cabin === val
                            ? "border-primary bg-primary text-white"
                            : "border-border bg-transparent text-foreground hover:border-primary/40"
                        }`}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Kun ledige pladser */}
              <label className="flex items-center justify-between gap-3 cursor-pointer">
                <span className="text-sm font-medium text-foreground">Kun ledige pladser</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={filters.onlyAvailable}
                  onClick={() => set("onlyAvailable", !filters.onlyAvailable)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    filters.onlyAvailable ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      filters.onlyAvailable ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </label>

              {/* Nulstil */}
              {activeCount > 0 && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" /> Nulstil filtre
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
