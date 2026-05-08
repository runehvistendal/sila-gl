"use client"

import { useCallback, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useLocale, useTranslations } from "next-intl"
import { nightsFromBookings } from "@/lib/cabinBookingDates"
import { toggleCabinAvailability } from "@/app/[locale]/opret/hytte/availability-actions"
import { cn } from "@/lib/utils"
import {
  CalendarMonthPanel,
  addCalendarMonths,
  type DayOverride,
} from "@/components/shared/CalendarMonthPanel"
import { localTodayYmd, yearMonthKey } from "@/lib/calendarYmd"

type BookingRow = { check_in: string; check_out: string; status: string }

type Props = {
  cabinId: string
  bookings: BookingRow[]
  /** manuelt blokerede datoer (YYYY-MM-DD) */
  manualBlockedYmd: string[]
}

const OWNER_FLOOR_YMD = "2000-01-01"

export default function CabinOwnerCalendar({
  cabinId,
  bookings,
  manualBlockedYmd,
}: Props) {
  const router = useRouter()
  const locale = useLocale()
  const loc = locale === "en" ? "en-GB" : "da-DK"
  const t = useTranslations("create")
  const weekShort =
    locale === "en"
      ? (["M", "T", "W", "T", "F", "S", "S"] as const)
      : (["M", "T", "O", "T", "F", "L", "S"] as const)

  const tMonthNav = (key: string) =>
    key === "prevMonth" ? t("prev_month") : t("next_month")

  const [pending, start] = useTransition()
  const todayYmd = localTodayYmd()
  const [cursorY, setCursorY] = useState(() => new Date().getFullYear())
  const [cursorM, setCursorM] = useState(() => new Date().getMonth())

  const bookedNights = useMemo(
    () => nightsFromBookings(bookings),
    [bookings],
  )
  const manualSet = useMemo(
    () => new Set(manualBlockedYmd),
    [manualBlockedYmd],
  )

  const minYm = yearMonthKey(2000, 0)
  function canPrev(): boolean {
    return yearMonthKey(cursorY, cursorM) > minYm
  }

  function handleDayPick(ymd: string) {
    if (bookedNights.has(ymd)) {
      toast.message(
        "Denne dato er booket af en gæst og kan ikke ændres her.",
      )
      return
    }
    const currentlyBlocked = manualSet.has(ymd)
    start(async () => {
      try {
        const r = await toggleCabinAvailability(
          cabinId,
          ymd,
          !currentlyBlocked,
        )
        if ("error" in r) {
          toast.error(r.error)
          return
        }
        toast.success(currentlyBlocked ? "Dato frigivet" : "Dato blokeret")
        router.refresh()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Noget gik galt")
      }
    })
  }

  const getDayOverride = useCallback(
    (ymd: string): DayOverride | null => {
      if (bookedNights.has(ymd)) return { visual: "booked", disabled: true }
      if (manualSet.has(ymd)) {
        return { visual: "blocked", disabled: false, showX: true }
      }
      return { visual: "selectable", disabled: false }
    },
    [bookedNights, manualSet],
  )

  return (
    <div
      className="rounded-2xl border border-border bg-card p-4 sm:p-6"
      style={{ fontFamily: "var(--font-jakarta, system-ui)" }}
    >
      <h2 className="text-lg font-bold text-foreground mb-1">Kalender</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Grå med gennemstregning: booket (låst) eller manuelt blokeret (klik for
        at frigive). Ledig dato: klik for at blokere. Ring omkring dagens dato
        hjælper med hurtig orientering.
      </p>
      <div
        className={cn(
          "rounded-xl border border-border/60 bg-muted/10 p-2 sm:p-3",
        )}
      >
        <CalendarMonthPanel
          year={cursorY}
          monthIndex={cursorM}
          floorYmd={OWNER_FLOOR_YMD}
          todayYmd={todayYmd}
          weekShort={weekShort}
          loc={loc}
          mode="single"
          checkIn=""
          checkOut=""
          singleDate=""
          onDayPick={handleDayPick}
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
          getDayOverride={(ymd) => getDayOverride(ymd)}
        />
      </div>
      {pending && (
        <p className="text-xs text-muted-foreground flex items-center gap-2 mt-3">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Opdaterer…
        </p>
      )}
      <ul className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
        <li className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-background border border-border" />
          Ledig
        </li>
        <li className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-gray-100 border border-gray-300" />
          Booket
        </li>
        <li className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-gray-200 border border-gray-400" />
          Blokeret
        </li>
      </ul>
    </div>
  )
}
