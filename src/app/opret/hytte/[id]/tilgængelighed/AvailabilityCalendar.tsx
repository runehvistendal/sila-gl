"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { saveAvailability } from "./actions"
import { toast } from "sonner"

const DAY_LABELS = ["Ma", "Ti", "On", "To", "Fr", "Lø", "Sø"]

function toYMD(d: Date): string {
  return d.toISOString().split("T")[0]
}

function addMonths(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(1)
  r.setMonth(r.getMonth() + n)
  return r
}

function buildMonthDays(year: number, month: number): (string | null)[] {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startOffset = (firstDay.getDay() + 6) % 7
  const days: (string | null)[] = []
  for (let i = 0; i < startOffset; i++) days.push(null)
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(toYMD(new Date(year, month, d)))
  }
  return days
}

const MONTH_NAMES = [
  "Januar", "Februar", "Marts", "April", "Maj", "Juni",
  "Juli", "August", "September", "Oktober", "November", "December",
]

interface Props {
  cabinId: string
  initialBlocked: string[]
  bookedDates: string[]
}

export default function AvailabilityCalendar({
  cabinId,
  initialBlocked,
  bookedDates,
}: Props) {
  const router = useRouter()
  const today = toYMD(new Date())

  const [firstMonth, setFirstMonth] = useState<Date>(() => {
    const d = new Date()
    d.setDate(1)
    return d
  })

  const [blockedDates, setBlockedDates] = useState<Set<string>>(
    () => new Set(initialBlocked),
  )
  const bookedSet = new Set(bookedDates)

  const [periodStart, setPeriodStart] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleDayClick(date: string) {
    if (bookedSet.has(date) || date < today) return

    if (!periodStart) {
      // First click — set period start
      setPeriodStart(date)
      return
    }

    if (periodStart === date) {
      // Click same date — toggle single date and reset
      setPeriodStart(null)
      setBlockedDates((prev) => {
        const next = new Set(prev)
        if (next.has(date)) next.delete(date)
        else next.add(date)
        return next
      })
      return
    }

    // Second click — build range and toggle all dates in it
    const start = periodStart < date ? periodStart : date
    const end = periodStart < date ? date : periodStart
    const range: string[] = []
    const cur = new Date(start)
    const endDate = new Date(end)
    while (cur <= endDate) {
      const d = toYMD(cur)
      if (!bookedSet.has(d) && d >= today) range.push(d)
      cur.setDate(cur.getDate() + 1)
    }

    const allBlocked = range.every((d) => blockedDates.has(d))
    setBlockedDates((prev) => {
      const next = new Set(prev)
      if (allBlocked) range.forEach((d) => next.delete(d))
      else range.forEach((d) => next.add(d))
      return next
    })
    setPeriodStart(null)
  }

  function getDayProps(
    date: string,
    isPeriodStart: boolean,
  ): { className: string; style: React.CSSProperties } {
    const base = "select-none transition-colors text-center text-sm py-1.5 rounded-md"
    if (bookedSet.has(date)) return {
      className: `${base} cursor-not-allowed opacity-80`,
      style: { backgroundColor: "#4A9CC7", color: "white" },
    }
    if (date < today) return {
      className: `${base} cursor-not-allowed`,
      style: { color: "#d1d5db" },
    }
    if (isPeriodStart) return {
      className: `${base} cursor-pointer ring-2 ring-offset-1`,
      style: { backgroundColor: "#0e7490", color: "white" },
    }
    if (blockedDates.has(date)) return {
      className: `${base} cursor-pointer`,
      style: { backgroundColor: "#e5e7eb", color: "#9ca3af" },
    }
    return {
      className: `${base} cursor-pointer`,
      style: { backgroundColor: "#dcfce7", color: "#166534" },
    }
  }

  function renderMonth(monthDate: Date) {
    const year = monthDate.getFullYear()
    const month = monthDate.getMonth()
    const days = buildMonthDays(year, month)

    return (
      <div key={`${year}-${month}`} className="flex-1 min-w-0">
        <p className="text-center text-sm font-semibold text-gray-700 mb-3">
          {MONTH_NAMES[month]} {year}
        </p>
        <div className="grid grid-cols-7 gap-0.5">
          {DAY_LABELS.map((l) => (
            <div key={l} className="text-center text-xs text-gray-400 font-medium py-1">
              {l}
            </div>
          ))}
          {days.map((date, i) => {
            if (date === null) return <div key={`empty-${i}`} />
            const props = getDayProps(date, date === periodStart)
            return (
              <div
                key={date}
                className={props.className}
                style={props.style}
                onClick={() => handleDayClick(date)}
              >
                {parseInt(date.split("-")[2])}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  function handleSave(publish: boolean) {
    startTransition(async () => {
      const result = await saveAvailability(cabinId, [...blockedDates], publish)
      if ("error" in result) {
        toast.error(result.error)
      } else {
        toast.success(publish ? "Hytte publiceret!" : "Tilgængelighed gemt")
        router.push(result.redirectTo)
      }
    })
  }

  const secondMonth = addMonths(firstMonth, 1)

  return (
    <div className="space-y-6">
      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-600">
        <span className="flex items-center gap-1.5">
          <span
            className="w-4 h-4 rounded inline-block"
            style={{ backgroundColor: "#dcfce7", border: "1px solid #bbf7d0" }}
          />
          Ledig (standard)
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="w-4 h-4 rounded inline-block"
            style={{ backgroundColor: "#e5e7eb" }}
          />
          Blokeret af dig
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="w-4 h-4 rounded inline-block"
            style={{ backgroundColor: "#4A9CC7" }}
          />
          Booket af gæst
        </span>
      </div>

      {/* Month navigation + status */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setFirstMonth((m) => addMonths(m, -1))}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Forrige måned"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm text-gray-500 text-center px-2">
          {periodStart
            ? `Startdato valgt: ${periodStart} — klik en slutdato for at blokere perioden`
            : "Klik en dato, eller klik to datoer for at blokere en periode"}
        </span>
        <button
          type="button"
          onClick={() => setFirstMonth((m) => addMonths(m, 1))}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Næste måned"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Cancel period selection */}
      {periodStart && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setPeriodStart(null)}
            className="text-xs text-muted-foreground underline hover:text-foreground"
          >
            Annullér periodevalg
          </button>
        </div>
      )}

      {/* Two-month grid */}
      <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
        {renderMonth(firstMonth)}
        {renderMonth(secondMonth)}
      </div>

      <p className="text-xs text-gray-400">
        {blockedDates.size} dag{blockedDates.size !== 1 ? "e" : ""} blokeret
      </p>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => handleSave(false)}
          disabled={isPending}
          className="flex-1 rounded-xl h-12"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Gem tilgængelighed"}
        </Button>
        <Button
          type="button"
          onClick={() => handleSave(true)}
          disabled={isPending}
          className="flex-1 rounded-xl h-12 font-semibold"
          style={{ backgroundColor: "#4A9CC7" }}
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Gem og publicér hytte →"}
        </Button>
      </div>
    </div>
  )
}
