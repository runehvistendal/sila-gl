"use client"

import { useMemo, useState, useTransition } from "react"
import { DayPicker } from "react-day-picker"
import { da } from "date-fns/locale"
import { format as formatDate } from "date-fns"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { nightsFromBookings } from "@/lib/cabinBookingDates"
import { toggleCabinAvailability } from "@/app/opret/hytte/availability-actions"
import { cn } from "@/lib/utils"
import "react-day-picker/style.css"

type BookingRow = { check_in: string; check_out: string; status: string }

type Props = {
  cabinId: string
  bookings: BookingRow[]
  /** manuelt blokerede datoer (YYYY-MM-DD) */
  manualBlockedYmd: string[]
}

export default function CabinOwnerCalendar({
  cabinId,
  bookings,
  manualBlockedYmd,
}: Props) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [month, setMonth] = useState(new Date())

  const bookedNights = useMemo(
    () => nightsFromBookings(bookings),
    [bookings],
  )
  const manualSet = useMemo(
    () => new Set(manualBlockedYmd),
    [manualBlockedYmd],
  )

  const ymd = (d: Date) => formatDate(d, "yyyy-MM-dd")
  const bookedMatcher = (date: Date) => bookedNights.has(ymd(date))
  const manualMatcher = (date: Date) => manualSet.has(ymd(date)) && !bookedNights.has(ymd(date))
  const freeMatcher = (date: Date) => !bookedNights.has(ymd(date)) && !manualSet.has(ymd(date))

  function onDayClick(date: Date) {
    const ymd = formatDate(date, "yyyy-MM-dd")
    if (bookedNights.has(ymd)) {
      toast.message("Denne dato er booket af en gæst og kan ikke ændres her.")
      return
    }
    const currentlyBlocked = manualSet.has(ymd)
    start(async () => {
      try {
        const r = await toggleCabinAvailability(cabinId, ymd, !currentlyBlocked)
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

  return (
    <div
      className="rounded-2xl border border-border bg-card p-4 sm:p-6"
      style={{ fontFamily: "var(--font-jakarta, system-ui)" }}
    >
      <h2 className="text-lg font-bold text-foreground mb-1">Kalender</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Blå: booket. Rød: manuelt blokeret. Grøn/klar: ledig. Klik på en ledig
        dato for at blokere; klik på rød for at frigive.
      </p>
      <div
        className={cn(
          "flex justify-center py-2 rounded-xl border border-border/60 bg-muted/10",
          "[&_.rdp-day]:!h-9 [&_.rdp-day]:!w-9",
        )}
      >
        <DayPicker
          mode="single"
          month={month}
          onMonthChange={setMonth}
          locale={da}
          onDayClick={onDayClick}
          modifiers={{
            booked: bookedMatcher,
            manual: manualMatcher,
            free: freeMatcher,
          }}
          modifiersClassNames={{
            booked: "!bg-blue-100 !text-blue-900 hover:!bg-blue-200",
            manual: "!bg-red-100 !text-red-900 hover:!bg-red-200",
            free: "!bg-emerald-50 !text-emerald-900 hover:!bg-emerald-100",
          }}
          className="!m-0"
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
          <span className="inline-block w-3 h-3 rounded-sm bg-blue-100 border border-blue-200" />
          Booket
        </li>
        <li className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-red-100 border border-red-200" />
          Blokeret
        </li>
        <li className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-background border border-border" />
          Ledig
        </li>
      </ul>
    </div>
  )
}
