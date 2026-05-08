"use client"

import { useCallback, useMemo, useState, useTransition } from "react"
import { Loader2 } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
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
import { cn } from "@/lib/utils"
import {
  CalendarMonthPanel,
  addCalendarMonths,
  type DayOverride,
} from "@/components/shared/CalendarMonthPanel"
import { parseYmd, yearMonthKey } from "@/lib/calendarYmd"

function toYMD(d: Date): string {
  return d.toISOString().split("T")[0]
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

interface Props {
  cabinId: string
  initialBlocked: string[]
  bookedDates: string[]
  initialMinNights?: number
  initialPreparationDays?: number
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
  const t = useTranslations("create")
  const tCommon = useTranslations("common")
  const locale = useLocale()
  const loc = locale === "en" ? "en-GB" : "da-DK"
  const weekShort =
    locale === "en"
      ? (["M", "T", "W", "T", "F", "S", "S"] as const)
      : (["M", "T", "O", "T", "F", "L", "S"] as const)

  const today = toYMD(new Date())
  const tStart = parseYmd(today)
  const [cursorY, setCursorY] = useState(tStart.getFullYear())
  const [cursorM, setCursorM] = useState(tStart.getMonth())

  const [blockedDates, setBlockedDates] = useState<Set<string>>(
    () => new Set(initialBlocked),
  )
  const bookedSet = useMemo(() => new Set(bookedDates), [bookedDates])

  const [minNights, setMinNights] = useState(initialMinNights)
  const [preparationDays, setPreparationDays] = useState(initialPreparationDays)

  const [pendingStart, setPendingStart] = useState<string | null>(null)
  const [hoveredDate, setHoveredDate] = useState<string | null>(null)

  const [isPending, startTransition] = useTransition()

  const previewRange = useMemo(() => {
    const s = new Set<string>()
    if (pendingStart && hoveredDate && pendingStart !== hoveredDate) {
      eachDayOfRange(pendingStart, hoveredDate).forEach((d) => {
        if (!bookedSet.has(d) && d >= today) s.add(d)
      })
    }
    return s
  }, [pendingStart, hoveredDate, bookedSet, today])

  const minYm = yearMonthKey(tStart.getFullYear(), tStart.getMonth())
  function canPrev(): boolean {
    return yearMonthKey(cursorY, cursorM) > minYm
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

  const getDayOverride = useCallback(
    (ymd: string): DayOverride | null => {
      const hoverHandlers =
        pendingStart && !bookedSet.has(ymd) && ymd >= today
          ? {
              onMouseEnter: () => setHoveredDate(ymd),
              onMouseLeave: () => setHoveredDate(null),
            }
          : {}

      if (bookedSet.has(ymd)) return { visual: "booked" }
      if (ymd < today) return { visual: "past", disabled: true }
      if (pendingStart === ymd) return { visual: "selected", disabled: false, ...hoverHandlers }
      if (previewRange.has(ymd)) {
        const willBlock = !blockedDates.has(pendingStart ?? "")
        return {
          visual: willBlock ? "previewBlock" : "previewFree",
          disabled: false,
          ...hoverHandlers,
        }
      }
      if (blockedDates.has(ymd)) {
        return { visual: "blocked", disabled: false, showX: true, ...hoverHandlers }
      }
      return { visual: "available", disabled: false, ...hoverHandlers }
    },
    [
      bookedSet,
      today,
      pendingStart,
      previewRange,
      blockedDates,
    ],
  )

  function handleSaveAvailability() {
    startTransition(async () => {
      const result = await saveAvailability(cabinId, [...blockedDates], false)
      if ("error" in result) {
        toast.error(result.error)
        return
      }
      toast.success(t("availability_saved"))
    })
  }

  function handleSaveSettings() {
    startTransition(async () => {
      const result = await saveCabinSettings(cabinId, minNights, preparationDays)
      if ("error" in result) {
        toast.error(result.error)
        return
      }
      toast.success(t("settings_saved"))
    })
  }

  function handleSaveAll(publish: boolean) {
    startTransition(async () => {
      const result = await saveAll(cabinId, [...blockedDates], minNights, preparationDays, publish)
      if ("error" in result) {
        toast.error(result.error)
        return
      }
      toast.success(publish ? t("cabin_published") : t("draft_saved"))
      window.location.href = result.redirectTo
    })
  }

  const tMonthNav = (key: string) =>
    key === "prevMonth" ? t("prev_month") : t("next_month")

  const next = addCalendarMonths(cursorY, cursorM, 1)

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-gray-50/60 p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">{t("booking_settings")}</h3>
        <div className="flex flex-col gap-5">
          <div className="space-y-1.5">
            <Label htmlFor="min-nights" className="text-sm font-medium text-foreground">
              {t("min_nights_label")}
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
              {minNights === 1
                ? t("min_nights_hint_one", { count: minNights })
                : t("min_nights_hint_other", { count: minNights })}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="preparation-days" className="text-sm font-medium text-foreground">
              {t("preparation_days_label")}
            </Label>
            <Select
              value={String(preparationDays)}
              onValueChange={(v) => setPreparationDays(Number(v))}
            >
              <SelectTrigger id="preparation-days" className="rounded-xl h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">{t("prep_none")}</SelectItem>
                <SelectItem value="1">{t("prep_1")}</SelectItem>
                <SelectItem value="2">{t("prep_2")}</SelectItem>
                <SelectItem value="3">{t("prep_3")}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t("preparation_days_hint")}
            </p>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSaveSettings}
            disabled={isPending}
            className="rounded-xl"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t("save_settings")}
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span
            className="h-3 w-3 shrink-0 rounded-full bg-emerald-500 ring-1 ring-emerald-600/40"
            aria-hidden
          />
          {t("legend_available")}
        </span>
        <span className="inline-flex items-center gap-2">
          <span
            className="h-3 w-3 shrink-0 rounded-full bg-gray-200 ring-1 ring-gray-400/60"
            aria-hidden
          />
          {t("legend_booked")}
        </span>
        <span className="inline-flex items-center gap-2">
          <span
            className="h-3 w-3 shrink-0 rounded-full bg-gray-400 ring-1 ring-gray-500/50"
            aria-hidden
          />
          {t("legend_blocked")}
        </span>
      </div>

      {pendingStart && (
        <div
          className="flex items-center justify-between rounded-lg border px-4 py-2 text-sm"
          style={{
            backgroundColor: "rgba(17, 71, 136, 0.08)",
            borderColor: "rgba(17, 71, 136, 0.35)",
            color: "#114788",
          }}
        >
          <span>{t("start_date_selected", { date: pendingStart })}</span>
          <button
            type="button"
            className="text-xs underline ml-4 shrink-0"
            onClick={() => {
              setPendingStart(null)
              setHoveredDate(null)
            }}
          >
            {tCommon("cancel")}
          </button>
        </div>
      )}

      <div
        className={cn(
          "rounded-2xl border border-gray-100 bg-white p-4 shadow-xl md:p-5",
        )}
      >
        <p className="text-xs text-center text-gray-400 mb-3">
          {pendingStart ? t("calendar_click_end") : t("calendar_click_start")}
        </p>
        <div className={cn("flex gap-4 md:gap-8", "flex-col md:flex-row")}>
          <CalendarMonthPanel
            year={cursorY}
            monthIndex={cursorM}
            floorYmd={today}
            todayYmd={today}
            weekShort={weekShort}
            loc={loc}
            mode="single"
            checkIn=""
            checkOut=""
            singleDate=""
            onDayPick={handleDayClick}
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
            tMonth={tMonthNav}
            getDayOverride={getDayOverride}
          />
          <div className="hidden w-px shrink-0 self-stretch bg-gray-200 md:block" aria-hidden />
          <div className="hidden md:block">
            <CalendarMonthPanel
              year={next.y}
              monthIndex={next.m}
              floorYmd={today}
              todayYmd={today}
              weekShort={weekShort}
              loc={loc}
              mode="single"
              checkIn=""
              checkOut=""
              singleDate=""
              onDayPick={handleDayClick}
              onPrev={() => {}}
              onNext={() => {
                const n = addCalendarMonths(cursorY, cursorM, 1)
                setCursorY(n.y)
                setCursorM(n.m)
              }}
              showNav="next"
              canPrev={false}
              showWeekdayRow={false}
              tMonth={tMonthNav}
              getDayOverride={getDayOverride}
            />
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-400">
        {blockedDates.size === 0
          ? t("no_dates_blocked")
          : t("blocked_count", { count: blockedDates.size })}
      </p>

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleSaveAvailability}
          disabled={isPending}
          className="flex-1 rounded-xl h-12"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t("save_availability")}
        </Button>
        {showPublishButton && (
          <Button
            type="button"
            onClick={() => handleSaveAll(true)}
            disabled={isPending}
            className="flex-1 rounded-xl h-12 font-semibold bg-[#114788] text-white hover:bg-[#114788]/90"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t("save_and_publish")}
          </Button>
        )}
        {!showPublishButton && (
          <Button
            type="button"
            onClick={() => handleSaveAll(false)}
            disabled={isPending}
            className="flex-1 rounded-xl h-12 font-semibold bg-[#114788] text-white hover:bg-[#114788]/90"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t("save_all")}
          </Button>
        )}
      </div>
    </div>
  )
}
