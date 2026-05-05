"use client"

import { useCallback, useEffect, useRef, useState, useTransition } from "react"
import { ChevronLeft, ChevronRight, Loader2, X } from "lucide-react"
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
  initialBlocked: string[]  // YYYY-MM-DD — datoer udlejeren har blokeret
  bookedDates: string[]     // YYYY-MM-DD — bekraeftede/afventende bookinger
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

  // blockedDates = datoer udlejeren IKKE vil udleje (graa med X)
  const [blockedDates, setBlockedDates] = useState<Set<string>>(
    () => new Set(initialBlocked),
  )
  const bookedSet = new Set(bookedDates)

  // Drag state
  const isDragging = useRef(false)
  const dragStart = useRef<string | null>(null)
  const [dragEnd, setDragEnd] = useState<string | null>(null)
  // Track whether drag is blocking or unblocking
  const dragAction = useRef<"block" | "unblock">("block")

  const [isPending, startTransition] = useTransition()

  // Dates in current drag range (excluding booked + past)
  const dragRange: Set<string> = new Set()
  if (isDragging.current && dragStart.current && dragEnd) {
    eachDayOfRange(dragStart.current, dragEnd).forEach((d) => {
      if (!bookedSet.has(d) && d >= today) dragRange.add(d)
    })
  }

  function commitDrag() {
    if (!isDragging.current || !dragStart.current) return
    const rangeDates = dragEnd
      ? eachDayOfRange(dragStart.current, dragEnd).filter(
          (d) => !bookedSet.has(d) && d >= today,
        )
      : [dragStart.current].filter((d) => !bookedSet.has(d) && d >= today)

    if (rangeDates.length > 0) {
      setBlockedDates((prev) => {
        const next = new Set(prev)
        if (dragAction.current === "block") {
          rangeDates.forEach((d) => next.add(d))
        } else {
          rangeDates.forEach((d) => next.delete(d))
        }
        return next
      })
    }

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
    // If date is already blocked -> drag will unblock; otherwise -> block
    dragAction.current = blockedDates.has(date) ? "unblock" : "block"
  }

  function handleDayMouseEnter(date: string) {
    if (!isDragging.current) return
    setDragEnd(date)
  }

  function handleDayClick(date: string) {
    if (bookedSet.has(date) || date < today) return
    setBlockedDates((prev) => {
      const next = new Set(prev)
      if (next.has(date)) next.delete(date)
      else next.add(date)
      return next
    })
  }

  function getDayStyle(date: string): {
    className: string
    showX: boolean
  } {
    const isBooked = bookedSet.has(date)
    const isPast = date < today
    const isInDrag = dragRange.has(date)
    const isBlocked = blockedDates.has(date)

    if (isBooked) {
      return {
        className: "bg-[#4A9CC7] text-white cursor-not-allowed opacity-90 rounded-md",
        showX: false,
      }
    }
    if (isPast) {
      return {
        className: "text-gray-300 cursor-not-allowed",
        showX: false,
      }
    }
    if (isInDrag) {
      const willBlock = dragAction.current === "block"
      return {
        className: willBlock
          ? "bg-gray-200 text-gray-500 cursor-pointer rounded-md"
          : "bg-green-200 text-green-800 cursor-pointer rounded-md",
        showX: false,
      }
    }
    if (isBlocked) {
      return {
        className:
          "bg-gray-100 text-gray-400 cursor-pointer rounded-md hover:bg-gray-200 relative",
        showX: true,
      }
    }
    // Available (default for all future dates)
    return {
      className:
        "bg-green-50 text-green-800 cursor-pointer rounded-md hover:bg-green-100 border border-green-200",
      showX: false,
    }
  }

  const renderMonth = useCallback(
    (monthDate: Date) => {
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
                  className={`relative text-center text-xs py-1.5 select-none transition-colors ${getDayStyle(date).className}`}
                  onMouseDown={() => handleDayMouseDown(date)}
                  onMouseEnter={() => handleDayMouseEnter(date)}
                  onClick={() => handleDayClick(date)}
                >
                  {parseInt(date.split("-")[2])}
                  {getDayStyle(date).showX && (
                    <X className="absolute top-0 right-0 w-2.5 h-2.5 text-gray-400" strokeWidth={2.5} />
                  )}
                </div>
              ),
            )}
          </div>
        </div>
      )
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [blockedDates, bookedSet, today, dragRange],
  )

  function handleSave(publish: boolean) {
    startTransition(async () => {
      const result = await saveAvailability(cabinId, [...blockedDates], publish)
      if ("error" in result) {
        toast.error(result.error)
        return
      }
      toast.success(publish ? "Hytte publiceret!" : "Kladde gemt")
      window.location.href = result.redirectTo
    })
  }

  const secondMonth = addMonths(firstMonth, 1)

  return (
    <div className="space-y-6">
      {/* Legend */}
      <div className="flex flex-col gap-1 text-sm text-gray-600">
        <span>🟢 <span className="font-medium">Ledig</span> — gæster kan booke</span>
        <span>🔵 <span className="font-medium">Booket</span> — låst automatisk</span>
        <span>⬜ <span className="font-medium">Blokeret af dig</span> — gæster kan ikke booke</span>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setFirstMonth((m) => addMonths(m, -1))}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Forrige maaned"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs text-gray-400 text-center">
          Klik én dato eller klik+træk for at blokere/frigive en periode
        </span>
        <button
          type="button"
          onClick={() => setFirstMonth((m) => addMonths(m, 1))}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Naeste maaned"
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
        {blockedDates.size === 0
          ? "Ingen datoer blokeret — alle fremtidige datoer er ledige."
          : `${blockedDates.size} dato${blockedDates.size !== 1 ? "er" : ""} blokeret af dig.`}
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
