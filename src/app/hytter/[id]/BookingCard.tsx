"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { formatKr, oreToKr } from "@/lib/money"
import CabinTransportSection, { type RideShareData } from "@/components/cabins/CabinTransportSection"
import type { CabinDetailData } from "./page"

interface Props {
  cabin: CabinDetailData
  transports: RideShareData[]
  isLoggedIn: boolean
  onLoginClick?: () => void
}

export default function BookingCard({ cabin, transports, isLoggedIn }: Props) {
  const [checkIn,    setCheckIn]    = useState("")
  const [checkOut,   setCheckOut]   = useState("")
  const [guests,     setGuests]     = useState(1)
  const [message,    setMessage]    = useState("")
  const [transportOre, setTransportOre] = useState(0)

  const today = new Date().toISOString().split("T")[0]

  const nights =
    checkIn && checkOut
      ? Math.max(0, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86_400_000))
      : 0

  const cabinTotalOre  = nights * cabin.price_per_night_ore
  const cleaningOre    = cabin.cleaning_fee_ore ?? 0
  const totalOre       = cabinTotalOre + cleaningOre + transportOre

  return (
    <>
      {/* ── Transport section (shares guests state) ── */}
      <CabinTransportSection
        cabin={cabin}
        transports={transports}
        guests={guests}
        onTransportCostChange={setTransportOre}
      />

      {/* ── Booking card ── */}
      <div className="bg-white rounded-2xl border border-border shadow-card p-6 sticky top-24 mt-8 lg:mt-0">
        <div className="flex items-baseline gap-2 mb-6">
          <span className="text-2xl font-bold text-foreground">{formatKr(cabin.price_per_night_ore)}</span>
          <span className="text-muted-foreground text-sm">pr. nat</span>
        </div>

        <div className="space-y-3 mb-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Ankomst
            </label>
            <Input
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              min={today}
              className="rounded-xl"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Afrejse
            </label>
            <Input
              type="date"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              min={checkIn || today}
              className="rounded-xl"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Gæster
            </label>
            <Input
              type="number"
              min={1}
              max={cabin.max_guests}
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value))}
              className="rounded-xl"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Besked til vært (valgfrit)
            </label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Fortæl lidt om din tur..."
              rows={3}
              className="rounded-xl resize-none"
            />
          </div>
        </div>

        {/* Price breakdown */}
        {nights > 0 && (
          <div className="bg-muted rounded-xl p-4 mb-4 text-sm space-y-1.5">
            <div className="flex justify-between text-muted-foreground">
              <span>{formatKr(cabin.price_per_night_ore)} × {nights} nat{nights !== 1 ? "ter" : ""}</span>
              <span>{formatKr(cabinTotalOre)}</span>
            </div>
            {cleaningOre > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Rengøringsgebyr</span>
                <span>{formatKr(cleaningOre)}</span>
              </div>
            )}
            {transportOre > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Transport</span>
                <span>{formatKr(transportOre)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-foreground pt-1 border-t border-border">
              <span>Total</span>
              <span>{formatKr(totalOre)}</span>
            </div>
          </div>
        )}

        {!isLoggedIn ? (
          <Button className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-semibold text-base">
            Log ind for at booke
          </Button>
        ) : (
          <Button
            disabled={nights === 0}
            className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-semibold text-base disabled:opacity-50"
          >
            {nights > 0 ? `Betal ${formatKr(totalOre)}` : "Vælg datoer"}
          </Button>
        )}

        <p className="text-xs text-muted-foreground text-center mt-3">
          Sikker betaling via Stripe — tilføjes snart
        </p>
      </div>
    </>
  )
}
