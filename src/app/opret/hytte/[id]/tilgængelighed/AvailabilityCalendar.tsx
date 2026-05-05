"use client"

import { useEffect, useRef, useState, useTransition } from "react"
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

function eachDayOfRange(a: string, b: string): string[] {
  const start = new Date(a < b ? a : b)
  const end = new Date(a < b ? b : a)
  const dates: string[] = []
  const cur = new Date(start)
  while (cur <= end) {
    dates.push(toYMD(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return dates
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
  initialBlocked: string[]  // YYYY-MM-DD strings already blocked in DB
  bookedDates: string[]     // YYYY-MM-DD strings that are booked (not clickable)
}

export default function AvailabilityCalendar({
  cabinId,
  initialBlocked,
  bookedDates,
}: Props) {
  const today = toYMD(new Date())
  const [firstMonth, setFirstMonth] = useState<Date>(() => {
    const d = new Date()
    d.setDate(1)
    return d
  })

  // State: the set of BLOCKED dates (grey). All other future dates are available (green).
  const [blockedDates, setBlockedDates] = useState<Set<string>>(
    () => new Set(initialBlocked),
  )
  const bookedSet = new Set(bookedDates)

  // Drag state
  const isDragging = useRef(false)
  const dragStart = useRef<string | null>(null)
  const [dragEnd, setDragEnd] = useState<string | null>(null)

  const [isPending, startTransition] = useTransition()

  // Drag preview — computed inline so renderMonth always sees latest value
  const dragRange: Set<string> = new Set()
  if (isDragging.current && dragStart.current && dragEnd) {
    eachDayOfRange(dragStart.current, dragEnd).forEach((d) => {
      if (!bookedSet.has(d)) dragRange.add(d)
    })
  }

  function commitDrag() {
    if (!isDragging.current || !dragStart.current) return
    const rangeDates = dragEnd
      ? eachDayOfRange(dragStart.current, dragEnd).filter((d) => !bookedSet.has(d))
      : [dragStart.current].filter((d) => !bookedSet.has(d))

    if (rangeDates.length === 0) return

    // If ALL range dates are already blocked → unblock; otherwise → block all
    const allBlocked = rangeDates.every((d) => blockedDates.has(d))
    setBlockedDates((prev) => {
      const next = new Set(prev)
      if (allBlocked) {
        rangeDates.forEach((d) => next.delete(d))
      } else {
        rangeDates.forEach((d) => next.add(d))
      }
      return next
    })

    isDragging.current = false
    dragStart.current = null
    setDragEnd(null)
  }

  useEffect(() => {
    function onMouseUp() {
      if (isDragging.current) commitDrag()
    }
    window.addEventListener("mouseup", onMouseUp)
    return () => window.removeEventListener("mouseup", onMouseUp)
  })

  function handleDayMouseDown(date: string) {
    if (bookedSet.has(date) || date < today) return
    isDragging.current = true
    dragStart.current = date
    setDragEnd(date)
  }

  function handleDayMouseEnter(date: string) {
    if (!isDragging.current) return
    setDragEnd(date)
  }

  function handleDayClick(date: string) {
    if (bookedSet.has(date) || date < today) return
    if (dragStart.current === date && dragEnd === date) {
      setBlockedDates((prev) => {
        const next = new Set(prev)
        if (next.has(date)) next.delete(date)
        else next.add(date)
        return next
      })
    }
  }

  function getDayStyle(date: string): string {
    const isBooked = bookedSet.has(date)
    const isPast = date < today
    const isInDrag = dragRange.has(date)
    const isBlocked = blockedDates.has(date)

    if (isBooked) {
      return "bg-[#4A9CC7] text-white cursor-not-allowed opacity-80"
    }
    if (isPast) {
      return "text-gray-300 cursor-not-allowed"
    }
    if (isInDrag) {
      return "bg-gray-300 text-gray-900 cursor-pointer rounded-md"
    }
    if (isBlocked) {
      return "bg-gray-200 text-gray-400 cursor-pointer rounded-md hover:bg-gray-300"
    }
    // Default: available (green)
    return "bg-green-100 text-green-800 cursor-pointer rounded-md hover:bg-green-200"
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
          {days.map((date, i) =>
            date === null ? (
              <div key={`empty-${i}`} />
            ) : (
              <div
                key={date}
                className={`text-center text-sm py-1.5 select-none transition-colors ${getDayStyle(date)}`}
                onMouseDown={() => handleDayMouseDown(date)}
                onMouseEnter={() => handleDayMouseEnter(date)}
                onClick={() => handleDayClick(date)}
              >
                {parseInt(date.split("-")[2])}
              </div>
            ),
          )}
        </div>
      </div>
    )
  }

  function handleSave(publish: boolean) {
    startTransition(async () => {
      try {
        await saveAvailability(cabinId, [...blockedDates], publish)
        toast.success(publish ? "Hytte publiceret!" : "Kladde gemt")
      } catch {
        toast.error("Noget gik galt — prøv igen")
      }
    })
  }

  const secondMonth = addMonths(firstMonth, 1)

  return (
    <div className="space-y-6">
      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-600">
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded bg-green-100 border border-green-200 inline-block" />
          Ledig (standard)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded bg-gray-200 inline-block" />
          Blokeret af dig
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded bg-[#4A9CC7] inline-block" />
          Booket af gæst
        </span>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setFirstMonth((m) => addMonths(m, -1))}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Forrige måned"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm text-gray-500">
          Klik for at blokere datoer — alle datoer er ledige som standard
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

      {/* Two-month grid */}
      <div
        className="flex flex-col sm:flex-row gap-6 sm:gap-8 select-none"
        onMouseLeave={() => {
          if (isDragging.current) commitDrag()
        }}
      >
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
