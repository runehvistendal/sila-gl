"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import Link from "next/link"
import { DayPicker, type DateRange } from "react-day-picker"
import { da } from "date-fns/locale"
import {
  format as formatDate,
  isBefore,
  startOfDay,
  parseISO,
} from "date-fns"
import { Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { formatKr } from "@/lib/money"
import {
  createCabinBooking,
  type TransportTrip,
} from "@/app/actions/bookings"
import { cn } from "@/lib/utils"
import "react-day-picker/style.css"

const DRAFT_KEY = "sila_cabin_booking_draft_v1"

type Draft = {
  cabinId: string
  checkIn: string
  checkOut: string
  guests: number
  transport: TransportTrip
}

type CabinProps = {
  id: string
  max_guests: number
  price_per_night_ore: number
  offers_transport: boolean
  transport_price_per_person_ore: number | null
}

type Props = {
  cabin: CabinProps
  isLoggedIn: boolean
  loginNextPath: string
  /** Optagne/blokerede nætter (YYYY-MM-DD) */
  disabledYmd: string[]
}

const TRIP_OPTIONS: { value: TransportTrip; label: string }[] = [
  { value: "none", label: "Uden transport" },
  { value: "round_trip", label: "Tur-retur" },
  { value: "outbound", label: "Kun udrejse" },
  { value: "return", label: "Kun hjemrejse" },
]

function parseYmdLocal(s: string): Date {
  return parseISO(s + "T12:00:00")
}

export default function CabinBookingWidget({
  cabin,
  isLoggedIn,
  loginNextPath,
  disabledYmd,
}: Props) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const today = startOfDay(new Date())

  const disabledSet = useMemo(
    () => new Set(disabledYmd),
    [disabledYmd],
  )

  const [range, setRange] = useState<DateRange | undefined>(undefined)
  const [guestsInput, setGuestsInput] = useState("1")
  const [transport, setTransport] = useState<TransportTrip>("none")

  const guests = Math.floor(Number(guestsInput)) || 0
  const guestInvalid = guests < 1 || guests > cabin.max_guests
  const guestError =
    guestInvalid && guestsInput !== ""
      ? guests > cabin.max_guests
        ? `Højst ${cabin.max_guests} gæster`
        : "Mindst 1 gæst"
      : null

  const checkIn =
    range?.from && !isNaN(range.from.getTime())
      ? formatDate(range.from, "yyyy-MM-dd")
      : ""
  const checkOut =
    range?.to && !isNaN(range.to.getTime())
      ? formatDate(range.to, "yyyy-MM-dd")
      : ""

  const nights =
    checkIn && checkOut
      ? Math.max(
          0,
          Math.round(
            (parseYmdLocal(checkOut).getTime() -
              parseYmdLocal(checkIn).getTime()) /
              86_400_000,
          ),
        )
      : 0

  const cabinTotalOre = nights * cabin.price_per_night_ore
  const perPerson = cabin.transport_price_per_person_ore ?? 0
  const transportTotalOre = useMemo(() => {
    if (!cabin.offers_transport || transport === "none" || perPerson <= 0) {
      return 0
    }
    if (transport === "round_trip") return perPerson * guests * 2
    if (transport === "outbound" || transport === "return") {
      return perPerson * guests
    }
    return 0
  }, [cabin.offers_transport, transport, perPerson, guests])

  const totalOre = cabinTotalOre + transportTotalOre

  const loginHref = `/login?next=${encodeURIComponent(loginNextPath)}`

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const d = JSON.parse(raw) as Draft
      if (d.cabinId !== cabin.id) return
      if (d.checkIn) {
        const from = parseYmdLocal(d.checkIn)
        const to = d.checkOut ? parseYmdLocal(d.checkOut) : undefined
        setRange({ from, to: to ?? from })
      }
      if (typeof d.guests === "number" && d.guests > 0) {
        setGuestsInput(String(d.guests))
      }
      if (d.transport) setTransport(d.transport)
      sessionStorage.removeItem(DRAFT_KEY)
    } catch {
      /* ignore */
    }
  }, [cabin.id])

  const disabledMatch = (date: Date) => {
    if (isBefore(startOfDay(date), today)) return true
    const y = formatDate(date, "yyyy-MM-dd")
    return disabledSet.has(y)
  }

  function persistDraft() {
    if (typeof window === "undefined") return
    const draft: Draft = {
      cabinId: cabin.id,
      checkIn,
      checkOut,
      guests: guestInvalid ? 1 : guests,
      transport,
    }
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  }

  function onBook() {
    if (guestInvalid || !checkIn || !checkOut) {
      if (guestInvalid) {
        toast.error(
          guests > cabin.max_guests
            ? `Højst ${cabin.max_guests} gæster`
            : "Angiv et gyldigt antal gæster",
        )
      } else {
        toast.error("Vælg både ind- og udtjek (datointerval)")
      }
      return
    }
    if (checkOut <= checkIn) {
      toast.error("Udtjek skal være efter indtjek")
      return
    }
    if (nights < 1) {
      toast.error("Mindst én overnatning")
      return
    }
    if (!isLoggedIn) {
      persistDraft()
      void router.push(loginHref)
      return
    }
    start(async () => {
      const r = await createCabinBooking({
        cabin_id: cabin.id,
        check_in: checkIn,
        check_out: checkOut,
        guests,
        transport_trip: cabin.offers_transport ? transport : "none",
      })
      if ("error" in r) {
        toast.error(r.error)
        return
      }
      window.location.assign(r.url)
    })
  }

  const bookDisabled =
    pending ||
    guestInvalid ||
    nights < 1 ||
    !checkIn ||
    !checkOut ||
    (cabin.offers_transport && transport !== "none" && perPerson <= 0)

  return (
    <div
      id="cabin-booking"
      className="w-full"
      style={{ fontFamily: "var(--font-jakarta, system-ui)" }}
    >
      <h2 className="text-lg sm:text-xl font-bold text-foreground mb-1">
        Book hytten
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Vælg datoer og gæster. Priser i DKK. Betaling via Stripe.
      </p>
      <div className="bg-white dark:bg-card rounded-2xl border border-border shadow-card p-4 sm:p-5">
        <div className="space-y-4">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
              Datoer
            </span>
            <div className="flex justify-center py-1 rounded-xl border border-border/80 bg-muted/20">
              <DayPicker
                mode="range"
                numberOfMonths={1}
                pagedNavigation
                locale={da}
                selected={range}
                onSelect={setRange}
                disabled={disabledMatch}
                fromDate={today}
                className="m-0"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Datoer med eksisterende booking eller værtens blokering er
              utilgængelige.
            </p>
          </div>

          <div>
            <label
              htmlFor="cabin_guests"
              className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block"
            >
              Gæster
            </label>
            <Input
              id="cabin_guests"
              type="number"
              min={1}
              value={guestsInput}
              onChange={(e) => setGuestsInput(e.target.value)}
              className={cn(
                "rounded-xl h-11 w-full sm:max-w-[12rem]",
                guestError && "border-destructive",
              )}
              aria-invalid={!!guestError}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Maks. {cabin.max_guests} gæster
            </p>
            {guestError && (
              <p className="text-xs text-destructive mt-1">{guestError}</p>
            )}
          </div>

          {cabin.offers_transport && perPerson > 0 && (
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                Transport (valgfrit)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {TRIP_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setTransport(o.value)}
                    className={cn(
                      "text-left rounded-lg px-3 py-2.5 text-sm border transition-colors",
                      transport === o.value
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border hover:border-primary/50",
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Pris pr. person pr. strækning: {formatKr(perPerson)} (beregning
                følger værtens tilbud).
              </p>
            </div>
          )}
        </div>

        {nights > 0 && cabinTotalOre > 0 && (
          <div className="mt-4 rounded-xl bg-muted p-4 text-sm space-y-1.5">
            <div className="flex justify-between text-muted-foreground">
              <span>
                {formatKr(cabin.price_per_night_ore)} × {nights} nat
                {nights !== 1 ? "ter" : ""}
              </span>
              <span className="font-medium text-foreground tabular-nums">
                {formatKr(cabinTotalOre)}
              </span>
            </div>
            {transportTotalOre > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Transport (tilvalg)</span>
                <span className="font-medium text-foreground tabular-nums">
                  {formatKr(transportTotalOre)}
                </span>
              </div>
            )}
            <div className="flex justify-between font-bold text-foreground pt-1 border-t border-border">
              <span>Total</span>
              <span className="tabular-nums">{formatKr(totalOre)}</span>
            </div>
            <p className="text-xs text-muted-foreground pt-1">
              Platformgebyr (15 %) håndteres i forbindelse med betalingen.
            </p>
          </div>
        )}

        <div className="mt-5">
          {isLoggedIn ? (
            <Button
              type="button"
              onClick={onBook}
              disabled={bookDisabled}
              className="h-12 w-full rounded-xl font-semibold"
            >
              {pending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin inline" />
                  Omdirigerer…
                </>
              ) : nights > 0 && !guestInvalid ? (
                `Book nu${totalOre > 0 ? " — " + formatKr(totalOre) : ""}`
              ) : (
                "Vælg datoer og gæster"
              )}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={onBook}
              disabled={bookDisabled}
              className="h-12 w-full rounded-xl font-semibold"
            >
              Log ind og book
            </Button>
          )}
        </div>

        <p className="text-xs text-center text-muted-foreground mt-3">
          {isLoggedIn ? (
            "Sikker betaling med Stripe"
          ) : (
            <>
              Har du allerede konto?{" "}
              <Link
                href={loginHref}
                className="text-primary font-medium hover:underline"
                onClick={() => {
                  if (checkIn && checkOut) persistDraft()
                }}
              >
                Log ind
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
