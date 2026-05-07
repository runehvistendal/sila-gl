"use client"

import { FormEvent, useCallback, useEffect, useRef, useState } from "react"
import { Minus, Plus, Search } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "@/i18n/navigation"
import LocationAutocomplete from "@/components/shared/LocationAutocomplete"
import { CalendarDropdown, formatRangeSummary, localTodayYmd, parseYmd } from "@/components/shared/DatePickerButton"
import type { GreenlandLocation } from "@/lib/greenlandLocations"
import { cn } from "@/lib/utils"

type HeroTab = "cabins" | "transport"
type ActivePanel = "where" | "when" | "who" | null

interface HeroSearchBarProps {
  tab: HeroTab
  majorHubs: GreenlandLocation[]
}

export default function HeroSearchBar({ tab, majorHubs }: HeroSearchBarProps) {
  const t = useTranslations("home.heroSearch")
  const locale = useLocale()
  const router = useRouter()

  const [hub, setHub] = useState("")
  const [checkIn, setCheckIn] = useState("")
  const [checkOut, setCheckOut] = useState("")
  const [guests, setGuests] = useState<number | null>(null)
  const [singleDate, setSingleDate] = useState("")
  const [activePanel, setActivePanel] = useState<ActivePanel>(null)

  const rootRef = useRef<HTMLDivElement>(null)
  const calendarRef = useRef<HTMLDivElement>(null)

  const today = localTodayYmd()

  const locOpen = activePanel === "where"
  const whenOpen = activePanel === "when"
  const whoOpen = activePanel === "who"

  const setWhereOpen = useCallback((open: boolean) => {
    setActivePanel((p) => {
      if (open) return "where"
      return p === "where" ? null : p
    })
  }, [])

  function openWho() {
    setActivePanel((p) => (p === "who" ? null : "who"))
  }

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      const target = e.target as Node
      if (target instanceof Element) {
        if (target.closest("[data-location-autocomplete-portal]")) return
        if (target.closest("[data-date-picker-dropdown]")) return
        if (rootRef.current?.contains(target)) return
      }
      setActivePanel(null)
    }
    document.addEventListener("mousedown", onDocMouseDown)
    return () => document.removeEventListener("mousedown", onDocMouseDown)
  }, [])

  function goToLocation(loc: GreenlandLocation) {
    setHub(loc.name_dk)
    router.push(`/ophold/i-naturen?hub=${encodeURIComponent(loc.name_dk)}`)
  }

  function submitSearch(e?: FormEvent) {
    e?.preventDefault()
    if (tab === "cabins") {
      const params = new URLSearchParams()
      const trimmedHub = hub.trim()
      if (trimmedHub) params.set("hub", trimmedHub)
      if (checkIn) params.set("checkIn", checkIn)
      if (checkOut && checkOut > checkIn) params.set("checkOut", checkOut)
      if (guests != null && guests >= 1) params.set("guests", String(guests))
      const qs = params.toString()
      router.push(`/ophold/i-naturen${qs ? `?${qs}` : ""}`)
    } else {
      const params = new URLSearchParams()
      if (singleDate) params.set("date", singleDate)
      const trimmedHub = hub.trim()
      if (trimmedHub) params.set("hub", trimmedHub)
      const qs = params.toString()
      router.push(`/transport${qs ? `?${qs}` : ""}`)
    }
    setActivePanel(null)
  }

  const whenSummary =
    tab === "cabins"
      ? checkIn && checkOut && checkOut > checkIn
        ? formatRangeSummary(checkIn, checkOut, locale, t)
        : ""
      : singleDate
        ? parseYmd(singleDate).toLocaleDateString(locale === "en" ? "en-GB" : "da-DK", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : ""

  return (
    <div
      className="relative z-[60] w-full max-w-[860px]"
      ref={rootRef}
      data-hero-search-root
    >
      <form onSubmit={submitSearch} className="relative z-[60]">
        <div
          className={cn(
            "bg-white shadow-lg flex w-full overflow-visible border border-gray-100",
            "flex-col rounded-2xl",
            "md:flex-row md:items-stretch md:rounded-full md:shadow-md",
          )}
        >
          <SearchSection
            label={t("whereLabel")}
            placeholder={t("wherePlaceholder")}
            value={hub}
            open={locOpen}
            onOpenChange={setWhereOpen}
            onChange={setHub}
            ariaLabel={t("wherePlaceholder")}
          />

          <div className="hidden md:block w-px bg-gray-200 self-stretch my-3 shrink-0" aria-hidden />
          <div className="md:hidden h-px w-full bg-gray-200 shrink-0" aria-hidden />

          <button
            type="button"
            onClick={() => {
              setActivePanel((p) => (p === "when" ? null : "when"))
            }}
            className="relative z-[1] flex flex-col items-stretch justify-center text-left px-6 py-4 md:py-3 md:px-5 flex-1 min-w-0 min-h-[4.25rem] md:min-h-0 hover:bg-gray-50/80 transition-colors rounded-none"
          >
            <span className="text-xs font-semibold text-[#09192A] mb-1 shrink-0">{t("whenLabel")}</span>
            <div className="min-h-9 flex w-full min-w-0 items-center">
              <span
                className={cn(
                  "text-sm truncate w-full",
                  whenSummary ? "text-[#09192A] font-medium" : "text-gray-500",
                )}
              >
                {whenSummary
                  ? whenSummary
                  : tab === "cabins"
                    ? t("datesPlaceholder")
                    : t("departurePlaceholder")}
              </span>
            </div>
          </button>

          {tab === "cabins" ? (
            <>
              <div className="hidden md:block w-px bg-gray-200 self-stretch my-3 shrink-0" aria-hidden />
              <div className="md:hidden h-px w-full bg-gray-200 shrink-0" aria-hidden />

              <div className="relative z-[2] flex-1 min-w-0">
                <button
                  type="button"
                  onClick={openWho}
                  className="relative z-[2] flex flex-col items-stretch justify-center text-left px-6 py-4 md:py-3 md:px-5 w-full min-h-[4.25rem] md:min-h-0 hover:bg-gray-50/80 transition-colors rounded-none"
                >
                  <span className="text-xs font-semibold text-[#09192A] mb-1 shrink-0">{t("whoLabel")}</span>
                  <div className="min-h-9 flex w-full min-w-0 items-center">
                    <span
                      className={cn(
                        "text-sm truncate w-full",
                        guests != null && guests >= 1 ? "text-[#09192A] font-medium" : "text-gray-500",
                      )}
                    >
                      {guests != null && guests >= 1
                        ? t("guestsCount", { count: guests })
                        : t("guestsPlaceholder")}
                    </span>
                  </div>
                </button>
                {whoOpen ? (
                  <GuestsPopover
                    key={`who-${whoOpen}-${guests ?? "none"}`}
                    guests={guests}
                    onGuestsChange={setGuests}
                    onClose={() => setActivePanel(null)}
                    t={t}
                  />
                ) : null}
              </div>
            </>
          ) : null}

          <div className="relative z-0 flex items-center justify-center p-3 md:pr-4 md:pl-1 shrink-0">
            <button
              type="submit"
              aria-label={t("searchAria")}
              className="h-12 w-12 md:h-14 md:w-14 rounded-full bg-[#4A9CC7] hover:bg-[#3d8bb5] flex items-center justify-center text-white shadow-md transition-colors"
            >
              <Search className="w-5 h-5 md:w-6 md:h-6" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {whenOpen ? (
          <CalendarDropdown
            ref={calendarRef}
            mode={tab === "cabins" ? "range" : "single"}
            today={today}
            checkIn={checkIn}
            checkOut={checkOut}
            singleDate={singleDate}
            onRangeChange={(ci, co) => {
              setCheckIn(ci)
              setCheckOut(co)
            }}
            onSingleChange={(d) => {
              setSingleDate(d)
              setActivePanel(null)
            }}
            onRequestClose={() => setActivePanel(null)}
            className="absolute left-0 right-0 top-full mt-2 z-[70] mx-0"
          />
        ) : null}
      </form>

      <div className="flex flex-wrap gap-2 mt-6">
        {tab === "cabins"
          ? majorHubs.map((loc) => (
          <button
            key={`${loc.postal_code}-${loc.name_dk}`}
            type="button"
            onClick={() => goToLocation(loc)}
            className="text-xs px-3 py-2 rounded-full transition-all hover:bg-white/20 active:scale-95"
            style={{
              backgroundColor: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "rgba(255,255,255,0.85)",
            }}
          >
            {loc.name_dk}
          </button>
            ))
          : null}
      </div>
    </div>
  )
}

function SearchSection({
  label,
  placeholder,
  value,
  open,
  onOpenChange,
  onChange,
  ariaLabel,
}: {
  label: string
  placeholder: string
  value: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onChange: (v: string) => void
  ariaLabel: string
}) {
  return (
    <div
      className="relative z-[1] flex flex-col items-stretch justify-center px-6 py-4 md:py-3 md:px-5 flex-[1.15] min-w-0 min-h-[4.25rem] md:min-h-0"
      onMouseDown={() => onOpenChange(true)}
    >
      <span className="text-xs font-semibold text-[#09192A] mb-1 shrink-0 pointer-events-none">{label}</span>
      <div
        className="min-h-9 flex w-full min-w-0 items-center -mx-1"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <LocationAutocomplete
          variant="embedded"
          className="w-full min-w-0"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          aria-label={ariaLabel}
          showOptionMeta={true}
          open={open}
          onOpenChange={onOpenChange}
        />
      </div>
    </div>
  )
}

function GuestsPopover({
  guests,
  onGuestsChange,
  onClose,
  t,
}: {
  guests: number | null
  onGuestsChange: (n: number | null) => void
  onClose: () => void
  t: (key: string, values?: Record<string, string | number>) => string
}) {
  const [draft, setDraft] = useState(() => (guests != null && guests >= 1 ? guests : 2))

  return (
    <div
      className="absolute left-0 right-0 md:left-auto md:right-0 md:min-w-[280px] top-full mt-2 z-[70] bg-white rounded-2xl shadow-xl border border-gray-100 p-5 mx-4 md:mx-0"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[#09192A]">{t("guestsLabel")}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={draft <= 1}
            onClick={() => setDraft((d) => Math.max(1, d - 1))}
            className="h-8 w-8 rounded-full border border-gray-200 flex items-center justify-center disabled:opacity-40 hover:bg-gray-50"
            aria-label={t("decreaseGuests")}
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="w-6 text-center font-semibold tabular-nums">{draft}</span>
          <button
            type="button"
            onClick={() => setDraft((d) => d + 1)}
            className="h-8 w-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50"
            aria-label={t("increaseGuests")}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
      <button
        type="button"
        className="mt-4 w-full py-2.5 rounded-xl bg-[#09192A] text-white text-sm font-semibold hover:bg-[#0d2540]"
        onClick={() => {
          onGuestsChange(draft)
          onClose()
        }}
      >
        {t("guestsDone")}
      </button>
    </div>
  )
}
