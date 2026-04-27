"use client"

import { useState } from "react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { formatKr } from "@/lib/money"
import CabinTransportSection, { type RideShareData } from "@/components/cabins/CabinTransportSection"
import type { CabinDetailData } from "./page"

interface Props {
  cabin: CabinDetailData
  transports: RideShareData[]
  isLoggedIn: boolean
}

export default function BookingCard({ cabin, transports, isLoggedIn }: Props) {
  const [guests, setGuests] = useState(1)

  return (
    <>
      <CabinTransportSection
        cabin={cabin}
        transports={transports}
        guests={guests}
      />

      <div className="bg-white rounded-2xl border border-border shadow-card p-6 sticky top-24 mt-8 lg:mt-0">
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-2xl font-bold text-foreground">
            {formatKr(cabin.price_per_night_ore)}
          </span>
          <span className="text-muted-foreground text-sm">pr. nat</span>
        </div>

        <div className="mb-4">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
            Gæster (transport)
          </label>
          <Input
            type="number"
            min={1}
            max={cabin.max_guests}
            value={guests}
            onChange={(e) =>
              setGuests(
                Math.max(
                  1,
                  Math.min(cabin.max_guests, Number(e.target.value) || 1),
                ),
              )
            }
            className="rounded-xl h-10"
          />
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Vælg datoer og gennemfør booking nedenfor på siden. Betaling sker
          sikkert med Stripe, når værten modtager betalinger.
        </p>

        <Button
          asChild
          className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-semibold text-base"
        >
          <Link href="#cabin-booking">Gå til booking</Link>
        </Button>

        {!isLoggedIn && (
          <p className="text-xs text-center text-muted-foreground mt-3">
            <Link
              href={`/login?next=${encodeURIComponent(`/hytter/${cabin.id}`)}`}
              className="underline underline-offset-2 hover:text-foreground"
            >
              Log ind
            </Link>{" "}
            for at booke.
          </p>
        )}

        <p className="text-xs text-muted-foreground text-center mt-3">
          Rengøringsgebyr m.m. følger værtens opslag. Den viste pris nedenfor er
          for overnatninger.
        </p>
      </div>
    </>
  )
}
