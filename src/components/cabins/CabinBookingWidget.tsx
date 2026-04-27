"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { formatKr } from "@/lib/money"
import { createCabinBooking } from "@/app/actions/bookings"

type Props = {
  cabin: {
    id: string
    max_guests: number
    price_per_night_ore: number
  }
  isLoggedIn: boolean
  /** Eksakt path til login redirect, fx /hytter/uuid */
  loginNextPath: string
}

export default function CabinBookingWidget({
  cabin,
  isLoggedIn,
  loginNextPath,
}: Props) {
  const [pending, start] = useTransition()
  const today = new Date().toISOString().split("T")[0]!

  const [checkIn, setCheckIn] = useState("")
  const [checkOut, setCheckOut] = useState("")
  const [guests, setGuests] = useState(1)

  const nights =
    checkIn && checkOut
      ? Math.max(
          0,
          Math.round(
            (new Date(checkOut + "T12:00:00").getTime() -
              new Date(checkIn + "T12:00:00").getTime()) /
              86_400_000,
          ),
        )
      : 0

  const totalOre = nights * cabin.price_per_night_ore

  const loginHref = `/login?next=${encodeURIComponent(loginNextPath)}`

  function onBook() {
    if (!isLoggedIn) {
      return
    }
    if (!checkIn || !checkOut) {
      toast.error("Vælg ind- og udtjeksdato")
      return
    }
    if (checkOut <= checkIn) {
      toast.error("Udtjek skal være efter indtjek")
      return
    }
    if (guests < 1 || guests > cabin.max_guests) {
      toast.error(`Vælg mellem 1 og ${cabin.max_guests} gæster`)
      return
    }
    start(async () => {
      const r = await createCabinBooking({
        cabin_id: cabin.id,
        check_in: checkIn,
        check_out: checkOut,
        guests,
      })
      if ("error" in r) {
        toast.error(r.error)
        return
      }
      window.location.assign(r.url)
    })
  }

  return (
    <div
      id="cabin-booking"
      className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 pt-8 border-t border-border"
      style={{ fontFamily: "var(--font-jakarta, system-ui)" }}
    >
      <h2 className="text-xl font-bold text-foreground mb-1">Book hytten</h2>
      <p className="text-sm text-muted-foreground mb-5">
        Vælg datoer og antal gæster. Prisen vises i DKK. Betalingen gennemføres
        sikkert med Stripe.
      </p>
      <div className="bg-white dark:bg-card rounded-2xl border border-border shadow-card p-5 sm:p-6 max-w-xl">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="cabin_check_in"
                className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block"
              >
                Indtjek
              </label>
              <Input
                id="cabin_check_in"
                type="date"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                min={today}
                className="rounded-xl h-11 w-full"
              />
            </div>
            <div>
              <label
                htmlFor="cabin_check_out"
                className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block"
              >
                Udtjek
              </label>
              <Input
                id="cabin_check_out"
                type="date"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                min={checkIn || today}
                className="rounded-xl h-11 w-full"
              />
            </div>
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
              max={cabin.max_guests}
              value={guests}
              onChange={(e) =>
                setGuests(
                  Math.max(
                    1,
                    Math.min(
                      cabin.max_guests,
                      Math.floor(Number(e.target.value)) || 1,
                    ),
                  ),
                )
              }
              className="rounded-xl h-11 w-full sm:max-w-[12rem]"
            />
          </div>
        </div>

        {nights > 0 && totalOre > 0 && (
          <div className="mt-4 rounded-xl bg-muted p-4 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>
                {formatKr(cabin.price_per_night_ore)} × {nights}{" "}
                nat{nights !== 1 ? "ter" : ""}
              </span>
              <span className="font-medium text-foreground tabular-nums">
                {formatKr(totalOre)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Platformgebyr (15 %) håndteres i forbindelse med betalingen.
            </p>
          </div>
        )}

        <div className="mt-5">
          {!isLoggedIn ? (
            <Button
              asChild
              className="h-12 w-full sm:w-auto rounded-xl font-semibold"
            >
              <Link href={loginHref}>Log ind for at booke</Link>
            </Button>
          ) : (
            <Button
              type="button"
              onClick={onBook}
              disabled={pending || nights < 1}
              className="h-12 w-full sm:w-auto rounded-xl font-semibold"
            >
              {pending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin inline" />
                  Omdirigerer…
                </>
              ) : nights > 0 ? (
                `Book nu${totalOre > 0 ? " — " + formatKr(totalOre) : ""}`
              ) : (
                "Vælg datoer"
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
