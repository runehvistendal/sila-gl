"use client"

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

export function localTodayYmd(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function parseYmd(ymd: string): Date {
  const [y, m, day] = ymd.split("-").map(Number)
  return new Date(y, m - 1, day)
}

function monthStartMondayPad(year: number, monthIndex: number): number {
  const first = new Date(year, monthIndex, 1)
  return (first.getDay() + 6) % 7
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate()
}

function addCalendarMonths(
  year: number,
  monthIndex: number,
  delta: number,
): { y: number; m: number } {
  const d = new Date(year, monthIndex + delta, 1)
  return { y: d.getFullYear(), m: d.getMonth() }
}

export function formatRangeSummary(
  checkIn: string,
  checkOut: string,
  locale: string,
  tRange: (key: string, values: { from: string; to: string }) => string,
): string {
  if (!checkIn || !checkOut || checkOut <= checkIn) return ""
  const loc = locale === "en" ? "en-GB" : "da-DK"
  const a = parseYmd(checkIn).toLocaleDateString(loc, {
    day: "numeric",
    month: "short",
  })
  const b = parseYmd(checkOut).toLocaleDateString(loc, {
    day: "numeric",
    month: "short",
  })
  return tRange("rangeDisplay", { from: a, to: b })
}

function formatSingleSummary(ymd: string, locale: string): string {
  if (!ymd) return ""
  const loc = locale === "en" ? "en-GB" : "da-DK"
  return parseYmd(ymd).toLocaleDateString(loc, {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export interface CalendarDropdownProps {
  mode: "range" | "single"
  today: string
  checkIn: string
  checkOut: string
  singleDate: string
  onRangeChange: (ci: string, co: string) => void
  onSingleChange: (d: string) => void
  className?: string
  /** Luk kalender (fx når interval er valgt) */
  onRequestClose?: () => void
}

export const CalendarDropdown = forwardRef<HTMLDivElement, CalendarDropdownProps>(
  function CalendarDropdown(
    {
      mode,
      today,
      checkIn,
      checkOut,
      singleDate,
      onRangeChange,
      onSingleChange,
      className,
      onRequestClose,
    },
    ref,
  ) {
    const locale = useLocale()
    const t = useTranslations("home.heroSearch")
    const loc = locale === "en" ? "en-GB" : "da-DK"
    const weekShort =
      locale === "en"
        ? (["M", "T", "W", "T", "F", "S", "S"] as const)
        : (["M", "T", "O", "T", "F", "L", "S"] as const)

    const initial = parseYmd(today)
    const [cursorY, setCursorY] = useState(initial.getFullYear())
    const [cursorM, setCursorM] = useState(initial.getMonth())

    const next = addCalendarMonths(cursorY, cursorM, 1)
    const minYm = `${initial.getFullYear()}-${initial.getMonth()}`

    function canPrev(): boolean {
      const k = `${cursorY}-${cursorM}`
      return k > minYm
    }

    function onDayPick(ymd: string) {
      if (ymd < today) return
      if (mode === "single") {
        onSingleChange(ymd)
        onRequestClose?.()
        return
      }
      if (!checkIn || (checkIn && checkOut)) {
        onRangeChange(ymd, "")
        return
      }
      if (ymd < checkIn) {
        onRangeChange(ymd, "")
        return
      }
      if (ymd === checkIn) {
        return
      }
      onRangeChange(checkIn, ymd)
      onRequestClose?.()
    }

    return (
      <div
        ref={ref}
        data-date-picker-dropdown
        className={cn(
          "rounded-2xl border border-gray-100 bg-white p-4 shadow-xl md:p-5",
          className,
        )}
      >
        <div className={cn("flex gap-4 md:gap-8", "flex-col md:flex-row")}>
          <MonthPanel
            year={cursorY}
            monthIndex={cursorM}
            today={today}
            weekShort={weekShort}
            loc={loc}
            mode={mode}
            checkIn={checkIn}
            checkOut={checkOut}
            singleDate={singleDate}
            onDayPick={onDayPick}
            onPrev={() => {
              if (!canPrev()) return
              const p = addCalendarMonths(cursorY, cursorM, -1)
              setCursorY(p.y)
              setCursorM(p.m)
            }}
            onNext={() => {
              const n = addCalendarMonths(cursorY, cursorM, 1)
              setCursorY(n.y)
              setCursorM(n.m)
            }}
            showNav="both"
            canPrev={canPrev()}
            showWeekdayRow
            tMonth={t}
          />
          <div className="hidden w-px shrink-0 self-stretch bg-gray-200 md:block" aria-hidden />
          <div className="hidden md:block">
            <MonthPanel
              year={next.y}
              monthIndex={next.m}
              today={today}
              weekShort={weekShort}
              loc={loc}
              mode={mode}
              checkIn={checkIn}
              checkOut={checkOut}
              singleDate={singleDate}
              onDayPick={onDayPick}
              onPrev={() => {}}
              onNext={() => {
                const n = addCalendarMonths(cursorY, cursorM, 1)
                setCursorY(n.y)
                setCursorM(n.m)
              }}
              showNav="next"
              canPrev={false}
              showWeekdayRow={false}
              tMonth={t}
            />
          </div>
        </div>
      </div>
    )
  },
)

function MonthPanel({
  year,
  monthIndex,
  today,
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
}: {
  year: number
  monthIndex: number
  today: string
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
    if (mode !== "range" || !checkIn || !checkOut || checkOut <= checkIn) return false
    return ymd > checkIn && ymd < checkOut
  }

  return (
    <div className="min-w-0 flex-1">
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
        <span className="text-sm font-semibold capitalize text-[#09192A]">
          {title}
        </span>
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
          const disabled = ymd < today
          const isCi = mode === "range" && checkIn === ymd
          const isCo = mode === "range" && checkOut === ymd
          const isSingle = mode === "single" && singleDate === ymd
          const rangeBg = inRange(ymd)
          const isEdge = isCi || isCo || isSingle

          return (
            <div key={ymd} className="relative aspect-square p-0.5">
              <button
                type="button"
                disabled={disabled}
                onClick={() => onDayPick(ymd)}
                className={cn(
                  "h-full w-full rounded-full text-sm font-medium transition-colors",
                  disabled && "cursor-not-allowed text-gray-300",
                  !disabled && !isEdge && !rangeBg && "text-[#09192A] hover:bg-gray-100",
                  rangeBg && "rounded-none bg-[#E8F4F8]",
                  isEdge && "bg-[#09192A] text-white hover:bg-[#09192A]",
                )}
              >
                {day}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export interface DatePickerButtonProps {
  mode: "range" | "single"
  checkIn?: string
  checkOut?: string
  date?: string
  onRangeChange?: (checkIn: string, checkOut: string) => void
  onDateChange?: (date: string) => void
  placeholder: string
  className?: string
  id?: string
  "aria-label"?: string
}

export default function DatePickerButton({
  mode,
  checkIn = "",
  checkOut = "",
  date = "",
  onRangeChange,
  onDateChange,
  placeholder,
  className,
  id: idProp,
  "aria-label": ariaLabel,
}: DatePickerButtonProps) {
  const locale = useLocale()
  const t = useTranslations("home.heroSearch")
  const tCommon = useTranslations("common")
  const autoId = useId()
  const btnId = idProp ?? `${autoId}-trigger`
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const today = localTodayYmd()

  const summary =
    mode === "range"
      ? checkIn && checkOut && checkOut > checkIn
        ? formatRangeSummary(checkIn, checkOut, locale, t)
        : checkIn
          ? formatSingleSummary(checkIn, locale)
          : ""
      : date
        ? formatSingleSummary(date, locale)
        : ""

  const hasValue =
    mode === "range"
      ? !!(checkIn || checkOut)
      : !!date

  const clear = useCallback(() => {
    if (mode === "range") {
      onRangeChange?.("", "")
    } else {
      onDateChange?.("")
    }
  }, [mode, onRangeChange, onDateChange])

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      const el = e.target
      if (!(el instanceof Node)) return
      if (rootRef.current?.contains(el)) return
      setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [open])

  return (
    <div
      ref={rootRef}
      data-date-picker-root
      className={cn("relative w-full md:w-auto", className)}
    >
      <div
        className={cn(
          "flex h-10 min-w-0 items-center gap-1 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm shadow-sm",
        )}
      >
        <button
          id={btnId}
          type="button"
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label={ariaLabel ?? placeholder}
          className="min-w-0 flex-1 truncate text-left font-medium text-[#09192A] outline-none"
          onClick={() => setOpen((o) => !o)}
        >
          {summary ? (
            <span>{summary}</span>
          ) : (
            <span className="font-normal text-muted-foreground">{placeholder}</span>
          )}
        </button>
        {hasValue ? (
          <button
            type="button"
            className="shrink-0 rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            aria-label={tCommon("clear")}
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.stopPropagation()
              clear()
              setOpen(false)
            }}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {open ? (
        <CalendarDropdown
          mode={mode}
          today={today}
          checkIn={checkIn}
          checkOut={checkOut}
          singleDate={date}
          onRangeChange={(ci, co) => {
            onRangeChange?.(ci, co)
          }}
          onSingleChange={(d) => {
            onDateChange?.(d)
          }}
          onRequestClose={() => setOpen(false)}
          className="absolute left-0 right-0 top-full z-50 mt-2 min-w-[min(100vw-2rem,20rem)] md:left-0 md:right-auto md:min-w-[38rem]"
        />
      ) : null}
    </div>
  )
}
