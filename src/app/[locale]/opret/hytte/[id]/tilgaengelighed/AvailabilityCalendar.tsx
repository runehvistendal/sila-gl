"use client"

import { useState, useTransition } from "react"
import { ChevronLeft, ChevronRight, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { saveAvailability, saveCabinSettings, saveAll } from "./actions"
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
  initialBlocked: string[]
  bookedDates: string[]
  initialMinNights?: number
  initialPreparationDays?: number
  /** Vises kun på tilgængeligheds-siden (trin 2), ikke på rediger-siden */
  showPublishButton?: boolean
}

export default function AvailabilityCalendar({
  cabinId,
  initialBlocked,
  bookedDates,
  initialMinNights = 1,
  initialPreparationDays = 0,
  showPublishButton = true,
}: Props) {
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

  // Bookingindstillinger (fælles state med gem-knapperne)
  const [minNights, setMinNights] = useState(initialMinNights)
  const [preparationDays, setPreparationDays] = useState(initialPreparationDays)

  // Periode-valg: første klik sætter start, andet klik fuldfører perioden
  const [pendingStart, setPendingStart] = useState<string | null>(null)
  const [hoveredDate, setHoveredDate] = useState<string | null>(null)

  const [isPending, startTransition] = useTransition()

  // Preview-range (mellem pendingStart og hovered)
  const previewRange: Set<string> = new Set()
  if (pendingStart && hoveredDate && pendingStart !== hoveredDate) {
    eachDayOfRange(pendingStart, hoveredDate).forEach((d) => {
      if (!bookedSet.has(d) && d >= today) previewRange.add(d)
    })
  }

  function handleDayClick(date: string) {
    if (bookedSet.has(date) || date < today) return

    if (pendingStart === null) {
      setPendingStart(date)
    } else if (pendingStart === date) {
      setBlockedDates((prev) => {
        const next = new Set(prev)
        if (next.has(date)) next.delete(date)
        else next.add(date)
        return next
      })
      setPendingStart(null)
    } else {
      const range = eachDayOfRange(pendingStart, date).filter(
        (d) => !bookedSet.has(d) && d >= today,
      )
      const shouldBlock = !blockedDates.has(pendingStart)
      setBlockedDates((prev) => {
        const next = new Set(prev)
        range.forEach((d) => {
          if (shouldBlock) next.add(d)
          else next.delete(d)
        })
        return next
      })
      setPendingStart(null)
    }
    setHoveredDate(null)
  }

  function getDayStyle(date: string): { style: React.CSSProperties; showX: boolean } {
    const isBooked = bookedSet.has(date)
    const isPast = date < today
    const isPendingStart = date === pendingStart
    const isInPreview = previewRange.has(date)
    const isBlocked = blockedDates.has(date)

    if (isBooked) {
      return {
        style: { backgroundColor: "#4A9CC7", color: "white", cursor: "not-allowed", opacity: 0.9, borderRadius: "6px" },
        showX: false,
      }
    }
    if (isPast) {
      return { style: { color: "#d1d5db", cursor: "not-allowed" }, showX: false }
    }
    if (isPendingStart) {
      return {
        style: { backgroundColor: "#1a5f7a", color: "white", cursor: "pointer", borderRadius: "6px", fontWeight: 600 },
        showX: false,
      }
    }
    if (isInPreview) {
      const willBlock = !blockedDates.has(pendingStart ?? "")
      return {
        style: {
          backgroundColor: willBlock ? "#e5e7eb" : "#dcfce7",
          color: willBlock ? "#6b7280" : "#166534",
          cursor: "pointer",
          borderRadius: "6px",
        },
        showX: false,
      }
    }
    if (isBlocked) {
      return {
        style: { backgroundColor: "#f3f4f6", color: "#9ca3af", cursor: "pointer", borderRadius: "6px", position: "relative" },
        showX: true,
      }
    }
    return {
      style: { backgroundColor: "#f0fdf4", color: "#166534", cursor: "pointer", borderRadius: "6px", border: "1px solid #bbf7d0" },
      showX: false,
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
          {days.map((date, i) =>
            date === null ? (
              <div key={`empty-${i}`} />
            ) : (
              <div
                key={date}
                className="relative text-center text-xs py-1.5 transition-colors"
                style={getDayStyle(date).style}
                onClick={() => handleDayClick(date)}
                onMouseEnter={() => { if (pendingStart) setHoveredDate(date) }}
                onMouseLeave={() => { if (pendingStart) setHoveredDate(null) }}
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
  }

  // Gem kun tilgængelighed (ingen publicering, ingen settings)
  function handleSaveAvailability() {
    startTransition(async () => {
      const result = await saveAvailability(cabinId, [...blockedDates], false)
      if ("error" in result) { toast.error(result.error); return }
      toast.success("Tilgængelighed gemt")
    })
  }

  // Gem kun indstillinger (hurtig-gem)
  function handleSaveSettings() {
    startTransition(async () => {
      const result = await saveCabinSettings(cabinId, minNights, preparationDays)
      if ("error" in result) { toast.error(result.error); return }
      toast.success("Indstillinger gemt")
    })
  }

  // Gem ALT + publicér (kombineret ét kald)
  function handleSaveAll(publish: boolean) {
    startTransition(async () => {
      const result = await saveAll(cabinId, [...blockedDates], minNights, preparationDays, publish)
      if ("error" in result) { toast.error(result.error); return }
      toast.success(publish ? "Hytte publiceret!" : "Kladde gemt")
      window.location.href = result.redirectTo
    })
  }

  const secondMonth = addMonths(firstMonth, 1)

  return (
    <div className="space-y-6">

      {/* ─── Bookingindstillinger ─── */}
      <div className="rounded-xl border border-border bg-gray-50/60 p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Bookingindstillinger</h3>
        <div className="flex flex-col gap-5">

          {/* Minimum nætter */}
          <div className="space-y-1.5">
            <Label htmlFor="min-nights" className="text-sm font-medium text-foreground">
              Minimum nætter
            </Label>
            <Input
              id="min-nights"
              type="number"
              min={1}
              max={30}
              value={minNights}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10)
                if (!isNaN(v)) setMinNights(v)
              }}
              className="rounded-xl h-11"
            />
            <p className="text-xs text-muted-foreground">
              Gæster skal booke minimum {minNights} {minNights === 1 ? "nat" : "nætter"}
            </p>
          </div>

          {/* Forberedelsestid */}
          <div className="space-y-1.5">
            <Label htmlFor="preparation-days" className="text-sm font-medium text-foreground">
              Forberedelsestid mellem bookinger
            </Label>
            <Select
              value={String(preparationDays)}
              onValueChange={(v) => setPreparationDays(Number(v))}
            >
              <SelectTrigger id="preparation-days" className="rounded-xl h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Ingen</SelectItem>
                <SelectItem value="1">1 dag</SelectItem>
                <SelectItem value="2">2 dage</SelectItem>
                <SelectItem value="3">3 dage</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Datoer blokeres automatisk efter en booking
            </p>
          </div>

        </div>

        {/* Hurtig-gem indstillinger */}
        <div className="mt-4 flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSaveSettings}
            disabled={isPending}
            className="rounded-xl"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Gem indstillinger"}
          </Button>
        </div>
      </div>

      {/* ─── Kalender-legende ─── */}
      <div className="flex flex-col gap-1 text-sm text-gray-600">
        <span>🟢 <span className="font-medium">Ledig</span> — gæster kan booke</span>
        <span>🔵 <span className="font-medium">Booket</span> — låst automatisk</span>
        <span>⬜ <span className="font-medium">Blokeret af dig</span> — gæster kan ikke booke</span>
      </div>

      {/* ─── Månedsnavigation ─── */}
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
          {pendingStart
            ? "Klik nu på en slutdato for at blokere perioden"
            : "Klik én dato for at blokere/frigive"}
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

      {/* Periode-valg: vis banner mens startdato er valgt */}
      {pendingStart && (
        <div className="flex items-center justify-between rounded-lg bg-[#1a5f7a]/8 border border-[#4A9CC7]/30 px-4 py-2 text-sm text-[#1a5f7a]">
          <span>
            Startdato valgt: <strong>{pendingStart}</strong> — klik en slutdato
          </span>
          <button
            type="button"
            className="text-xs underline ml-4 shrink-0"
            onClick={() => { setPendingStart(null); setHoveredDate(null) }}
          >
            Annuller
          </button>
        </div>
      )}

      {/* ─── To-måneds grid ─── */}
      <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
        {renderMonth(firstMonth)}
        {renderMonth(secondMonth)}
      </div>

      <p className="text-xs text-gray-400">
        {blockedDates.size === 0
          ? "Ingen datoer blokeret — alle fremtidige datoer er ledige."
          : `${blockedDates.size} dato${blockedDates.size !== 1 ? "er" : ""} blokeret af dig.`}
      </p>

      {/* ─── Gem-knapper ─── */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleSaveAvailability}
          disabled={isPending}
          className="flex-1 rounded-xl h-12"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Gem tilgængelighed"}
        </Button>
        {showPublishButton && (
          <Button
            type="button"
            onClick={() => handleSaveAll(true)}
            disabled={isPending}
            className="flex-1 rounded-xl h-12 font-semibold"
            style={{ backgroundColor: "#4A9CC7" }}
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Gem og publicér hytte →"}
          </Button>
        )}
        {!showPublishButton && (
          <Button
            type="button"
            onClick={() => handleSaveAll(false)}
            disabled={isPending}
            className="flex-1 rounded-xl h-12 font-semibold"
            style={{ backgroundColor: "#4A9CC7" }}
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Gem alt →"}
          </Button>
        )}
      </div>
    </div>
  )
}
