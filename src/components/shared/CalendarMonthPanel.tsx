"use client"

import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { cn } from "@/lib/utils"

export type CalendarDayVisual =
  | "past"
  | "selectable"
  | "rangeMiddle"
  | "selected"
  | "unavailable"
  | "todayIdle"
  | "booked"
  | "blocked"
  | "available"
  | "previewBlock"
  | "previewFree"

export function dayCellClass(visual: CalendarDayVisual): string {
  return cn(
    "h-full w-full rounded-full text-sm font-medium transition-colors",
    visual === "past" &&
      "cursor-not-allowed text-gray-400 line-through decoration-gray-400",
    visual === "unavailable" &&
      "cursor-not-allowed bg-gray-100 text-gray-400 line-through decoration-gray-400 pointer-events-none",
    visual === "booked" &&
      "cursor-not-allowed bg-gray-100 text-gray-400 line-through decoration-gray-400 pointer-events-none",
    visual === "selectable" && "text-[#09192A] hover:bg-gray-100",
    visual === "todayIdle" &&
      "text-[#09192A] ring-1 ring-inset ring-[#114788] hover:bg-gray-100",
    visual === "rangeMiddle" &&
      "rounded-none bg-[#114788]/15 text-[#09192A]",
    visual === "selected" &&
      "bg-[#114788] text-white hover:bg-[#114788]",
    visual === "blocked" &&
      "bg-gray-200 text-gray-600 line-through decoration-gray-500 hover:bg-gray-300",
    visual === "available" &&
      "border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
    visual === "previewBlock" && "rounded-md bg-gray-200 text-gray-600",
    visual === "previewFree" && "rounded-md bg-emerald-100 text-emerald-800",
  )
}

export function addCalendarMonths(
  year: number,
  monthIndex: number,
  delta: number,
): { y: number; m: number } {
  const d = new Date(year, monthIndex + delta, 1)
  return { y: d.getFullYear(), m: d.getMonth() }
}

function monthStartMondayPad(year: number, monthIndex: number): number {
  const first = new Date(year, monthIndex, 1)
  return (first.getDay() + 6) % 7
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate()
}

export type DayOverride = {
  visual: CalendarDayVisual
  disabled?: boolean
  showX?: boolean
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

/** Én måned — samme gitter som `CalendarDropdown`. */
export function CalendarMonthPanel({
  year,
  monthIndex,
  floorYmd,
  todayYmd,
  weekShort,
  loc,
  mode,
  checkIn,
  checkOut,
  singleDate,
  onDayPick,
  onPrev,
  onNext,
  showNav,
  canPrev,
  showWeekdayRow = true,
  tMonth,
  getDayOverride,
  isUnavailable,
}: {
  year: number
  monthIndex: number
  floorYmd: string
  /** Til subtil «i dag»-ring når dagen ikke er valgt */
  todayYmd: string
  weekShort: readonly string[]
  loc: string
  mode: "range" | "single"
  checkIn: string
  checkOut: string
  singleDate: string
  onDayPick: (ymd: string) => void
  onPrev: () => void
  onNext: () => void
  showNav: "both" | "next"
  canPrev: boolean
  showWeekdayRow?: boolean
  tMonth: (key: string) => string
  getDayOverride?: (ymd: string, day: number) => DayOverride | null
  isUnavailable?: (ymd: string) => boolean
}) {
  const title = new Date(year, monthIndex, 1).toLocaleDateString(loc, {
    month: "long",
    year: "numeric",
  })
  const pad = monthStartMondayPad(year, monthIndex)
  const dim = daysInMonth(year, monthIndex)
  const cells: (number | null)[] = [
    ...Array(pad).fill(null),
    ...Array.from({ length: dim }, (_, i) => i + 1),
  ]

  function cellYmd(day: number): string {
    return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
  }

  function inRange(ymd: string): boolean {
    if (mode !== "range" || !checkIn || !checkOut || checkOut <= checkIn) {
      return false
    }
    return ymd > checkIn && ymd < checkOut
  }

  function defaultVisual(
    ymd: string,
  ): { visual: CalendarDayVisual; disabled: boolean } {
    if (ymd < floorYmd) return { visual: "past", disabled: true }
    if (isUnavailable?.(ymd)) return { visual: "unavailable", disabled: true }
    const isCi = mode === "range" && checkIn === ymd
    const isCo = mode === "range" && checkOut === ymd
    const isSingle = mode === "single" && singleDate === ymd
    const rangeBg = inRange(ymd)
    const isEdge = isCi || isCo || isSingle
    if (isEdge) return { visual: "selected", disabled: false }
    if (rangeBg) return { visual: "rangeMiddle", disabled: false }
    if (ymd === todayYmd) return { visual: "todayIdle", disabled: false }
    return { visual: "selectable", disabled: false }
  }

  return (
    <div
      className="min-w-0 flex-1"
      style={{ fontFamily: "var(--font-jakarta, system-ui)" }}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        {showNav === "both" ? (
          <button
            type="button"
            onClick={onPrev}
            disabled={!canPrev}
            className="rounded-full p-1.5 hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-30"
            aria-label={tMonth("prevMonth")}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        ) : (
          <span className="w-8" />
        )}
        <span className="text-sm font-semibold capitalize text-[#09192A]">{title}</span>
        {showNav === "both" ? (
          <button
            type="button"
            onClick={onNext}
            className="rounded-full p-1.5 hover:bg-gray-100"
            aria-label={tMonth("nextMonth")}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onNext}
            className="rounded-full p-1.5 hover:bg-gray-100"
            aria-label={tMonth("nextMonth")}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>
      {showWeekdayRow ? (
        <div className="mb-1 grid grid-cols-7 gap-y-1 text-center text-[11px] font-semibold text-gray-400">
          {weekShort.map((w, i) => (
            <div key={`${i}-${w}`} className="py-1">
              {w}
            </div>
          ))}
        </div>
      ) : null}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, idx) => {
          if (day == null) {
            return <div key={`e-${idx}`} className="aspect-square" />
          }
          const ymd = cellYmd(day)
          const base = defaultVisual(ymd)
          const o = getDayOverride?.(ymd, day)
          const visual = o?.visual ?? base.visual
          let disabled = base.disabled
          if (o) {
            if (o.disabled !== undefined) disabled = o.disabled
            else {
              disabled =
                visual === "past" ||
                visual === "booked" ||
                visual === "unavailable"
            }
          }

          const showX = o?.showX ?? false

          return (
            <div
              key={ymd}
              className="relative aspect-square p-0.5"
              onMouseEnter={o?.onMouseEnter}
              onMouseLeave={o?.onMouseLeave}
            >
              <button
                type="button"
                disabled={disabled}
                onClick={() => onDayPick(ymd)}
                className={dayCellClass(visual)}
              >
                {day}
              </button>
              {showX ? (
                <X
                  className="pointer-events-none absolute right-0 top-0 h-2.5 w-2.5 text-gray-500"
                  strokeWidth={2.5}
                />
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
