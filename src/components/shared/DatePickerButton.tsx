"use client"

import { useCallback, useEffect, useId, useRef, useState } from "react"
import { X } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import { CalendarDropdown } from "@/components/shared/CalendarDropdown"
import { localTodayYmd, parseYmd } from "@/lib/calendarYmd"

export { localTodayYmd, parseYmd } from "@/lib/calendarYmd"
export type { CalendarDropdownProps } from "@/components/shared/CalendarDropdown"

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
  /** Første valgbare dato (YYYY-MM-DD), fx dagen efter udrejse for retur */
  earliestYmd?: string
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
  earliestYmd,
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
          earliestYmd={earliestYmd}
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
