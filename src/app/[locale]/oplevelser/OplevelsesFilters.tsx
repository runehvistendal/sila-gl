"use client"

import { useEffect, useRef, useState, useCallback, useMemo } from "react"
import { useRouter } from "@/i18n/navigation"
import { useLocale, useTranslations } from "next-intl"
import { SlidersHorizontal, X } from "lucide-react"
import LocationAutocomplete from "@/components/shared/LocationAutocomplete"
import { EXPERIENCE_CATEGORIES } from "@/lib/experienceCategories"
import { getLocationName } from "@/lib/greenlandLocations"

export interface OplevelseFilterValues {
  hub: string
  date: string
  category: string
}

const FILTER_BASE = "/oplevelser"

const SELECT_CLS =
  "h-10 rounded-xl border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring text-foreground cursor-pointer w-full"

export default function OplevelsesFilters({ initial }: { initial: OplevelseFilterValues }) {
  const router = useRouter()
  const locale = useLocale()
  const tFilters = useTranslations("ophold.filters")
  const panelRef = useRef<HTMLDivElement>(null)
  const [showPanel, setShowPanel] = useState(false)
  const [hubDraft, setHubDraft] = useState(initial.hub)
  const [dateDraft, setDateDraft] = useState(initial.date)
  const [categoryDraft, setCategoryDraft] = useState(initial.category)

  useEffect(() => {
    setHubDraft(initial.hub)
    setDateDraft(initial.date)
    setCategoryDraft(initial.category)
  }, [initial.hub, initial.date, initial.category])

  const pushUrl = useCallback((next: OplevelseFilterValues) => {
    const p = new URLSearchParams()
    if (next.hub.trim()) p.set("hub", next.hub.trim())
    if (next.date.trim()) p.set("date", next.date.trim())
    if (next.category.trim()) p.set("category", next.category.trim())
    const qs = p.toString()
    router.push(`${FILTER_BASE}${qs ? `?${qs}` : ""}`)
  }, [router])

  useEffect(() => {
    if (!showPanel) return
    function onClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowPanel(false)
      }
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [showPanel])

  const activeCount =
    (initial.hub ? 1 : 0) + (initial.date ? 1 : 0) + (initial.category ? 1 : 0)

  function resetAll() {
    setHubDraft("")
    setDateDraft("")
    setCategoryDraft("")
    router.push(FILTER_BASE)
    setShowPanel(false)
  }

  function removeHub() {
    pushUrl({ ...initial, hub: "" })
  }
  function removeDate() {
    pushUrl({ ...initial, date: "" })
  }
  function removeCategory() {
    pushUrl({ ...initial, category: "" })
  }

  const locChip =
    initial.hub.trim() !== "" ? getLocationName(initial.hub) || initial.hub : null

  const dateChipFmt = useMemo(() => {
    if (!initial.date) return null
    const loc = locale === "en" ? "en-GB" : "da-DK"
    try {
      const d = new Date(initial.date + "T12:00:00.000Z")
      return new Intl.DateTimeFormat(loc, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(d)
    } catch {
      return initial.date
    }
  }, [initial.date, locale])

  const categoryChipLabel =
    initial.category &&
    EXPERIENCE_CATEGORIES.find((c) => c.key === initial.category)?.label

  const allCategoriesLabel = locale === "en" ? "All categories" : "Alle kategorier"
  const dateLabel = locale === "en" ? "Date" : "Dato"

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap items-stretch sm:items-center">
        <div className="relative shrink-0" ref={panelRef}>
          <button
            type="button"
            className={`rounded-xl h-10 px-3 text-sm font-medium border shadow-sm flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              showPanel
                ? "border-primary bg-primary/5 text-primary"
                : "border-input bg-transparent hover:bg-muted text-foreground"
            }`}
            onClick={() => setShowPanel((v) => !v)}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {locale === "en" ? "Filter" : "Filtrer"}
            {activeCount > 0 && (
              <span className="bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5 leading-none font-semibold">
                {activeCount}
              </span>
            )}
          </button>

          {showPanel && (
            <div className="absolute left-0 top-12 z-50 w-[min(100vw-2rem,22rem)] sm:w-80 bg-card border border-border rounded-2xl shadow-lg p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  {locale === "en" ? "Location" : "Lokation"}
                </label>
                <LocationAutocomplete
                  value={hubDraft}
                  onChange={(name_dk) => {
                    setHubDraft(name_dk)
                    pushUrl({
                      hub: name_dk,
                      date: dateDraft,
                      category: categoryDraft,
                    })
                  }}
                  variant="default"
                  showOptionMeta={false}
                  placeholder={tFilters("all_destinations")}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  {dateLabel}
                </label>
                <input
                  type="date"
                  value={dateDraft}
                  onChange={(e) => {
                    const v = e.target.value
                    setDateDraft(v)
                    pushUrl({
                      hub: hubDraft,
                      date: v,
                      category: categoryDraft,
                    })
                  }}
                  className={`${SELECT_CLS} [color-scheme:light]`}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  {locale === "en" ? "Category" : "Kategori"}
                </label>
                <select
                  value={categoryDraft}
                  onChange={(e) => {
                    const v = e.target.value
                    setCategoryDraft(v)
                    pushUrl({
                      hub: hubDraft,
                      date: dateDraft,
                      category: v,
                    })
                  }}
                  className={SELECT_CLS}
                >
                  <option value="">{allCategoriesLabel}</option>
                  {EXPERIENCE_CATEGORIES.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {activeCount > 0 && (
                <button
                  type="button"
                  onClick={resetAll}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" /> {tFilters("reset_filters")}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {(locChip || dateChipFmt || categoryChipLabel) && (
        <div className="flex flex-wrap gap-2">
          {locChip ? (
            <button
              type="button"
              onClick={removeHub}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border border-border bg-muted/60 hover:bg-muted text-foreground"
            >
              {locChip}
              <X className="w-3 h-3 shrink-0 opacity-70" aria-hidden />
            </button>
          ) : null}
          {dateChipFmt ? (
            <button
              type="button"
              onClick={removeDate}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border border-border bg-muted/60 hover:bg-muted text-foreground"
            >
              {dateChipFmt}
              <X className="w-3 h-3 shrink-0 opacity-70" aria-hidden />
            </button>
          ) : null}
          {categoryChipLabel ? (
            <button
              type="button"
              onClick={removeCategory}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border border-border bg-muted/60 hover:bg-muted text-foreground"
            >
              {categoryChipLabel}
              <X className="w-3 h-3 shrink-0 opacity-70" aria-hidden />
            </button>
          ) : null}
        </div>
      )}
    </div>
  )
}
