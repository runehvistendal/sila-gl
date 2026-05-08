"use client"

import { forwardRef, useEffect, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import { parseYmd, yearMonthKey } from "@/lib/calendarYmd"
import {
  CalendarMonthPanel,
  addCalendarMonths,
} from "@/components/shared/CalendarMonthPanel"

export interface CalendarDropdownProps {
  mode: "range" | "single"
  /** Dagens dato YYYY-MM-DD (til «i dag»-ring og min. logik) */
  today: string
  /** Første valgbare dato; senere end `today` begrænser fx returdato */
  earliestYmd?: string
  checkIn: string
  checkOut: string
  singleDate: string
  onRangeChange: (ci: string, co: string) => void
  onSingleChange: (d: string) => void
  className?: string
  onRequestClose?: () => void
  /** Datoer der ikke kan vælges (booket/blokeret), ymd ≥ floor — grå + gennemstregning */
  isUnavailable?: (ymd: string) => boolean
  /** Kun én måned (fx booking-widget) */
  showSingleMonth?: boolean
}

export const CalendarDropdown = forwardRef<
  HTMLDivElement,
  CalendarDropdownProps
>(function CalendarDropdown(
  {
    mode,
    today,
    earliestYmd,
    checkIn,
    checkOut,
    singleDate,
    onRangeChange,
    onSingleChange,
    className,
    onRequestClose,
    isUnavailable,
    showSingleMonth = false,
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

  const floor =
    earliestYmd && earliestYmd > today ? earliestYmd : today
  const initial = parseYmd(floor)
  const [cursorY, setCursorY] = useState(initial.getFullYear())
  const [cursorM, setCursorM] = useState(initial.getMonth())

  useEffect(() => {
    const d = parseYmd(floor)
    setCursorY(d.getFullYear())
    setCursorM(d.getMonth())
  }, [floor])

  const next = addCalendarMonths(cursorY, cursorM, 1)
  const minYm = yearMonthKey(initial.getFullYear(), initial.getMonth())

  function canPrev(): boolean {
    return yearMonthKey(cursorY, cursorM) > minYm
  }

  function onDayPick(ymd: string) {
    if (ymd < floor) return
    if (isUnavailable?.(ymd)) return
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

  const panelProps = {
    floorYmd: floor,
    todayYmd: today,
    weekShort,
    loc,
    mode,
    checkIn,
    checkOut,
    singleDate,
    onDayPick,
    isUnavailable,
    tMonth: t,
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
        <CalendarMonthPanel
          year={cursorY}
          monthIndex={cursorM}
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
          {...panelProps}
        />
        {!showSingleMonth ? (
          <>
            <div
              className="hidden w-px shrink-0 self-stretch bg-gray-200 md:block"
              aria-hidden
            />
            <div className="hidden md:block">
              <CalendarMonthPanel
                year={next.y}
                monthIndex={next.m}
                onPrev={() => {}}
                onNext={() => {
                  const n = addCalendarMonths(cursorY, cursorM, 1)
                  setCursorY(n.y)
                  setCursorM(n.m)
                }}
                showNav="next"
                canPrev={false}
                showWeekdayRow={false}
                {...panelProps}
              />
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
})
