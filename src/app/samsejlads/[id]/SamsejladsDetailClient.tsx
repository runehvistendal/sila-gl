"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { da } from "date-fns/locale"
import {
  Anchor, ArrowRight, Users, Clock, Ship, User, Star, AlertCircle, Loader2,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { StarBar } from "@/components/cabins/CabinReviews"
import { formatKr } from "@/lib/money"
import type { RideShareDetail } from "./page"

interface ReviewRow {
  id: string
  rating: number
  comment: string | null
  created_at: string
  profiles: { full_name: string | null } | null
}

interface Props {
  rideShare: RideShareDetail
  reviews: ReviewRow[]
  currentUserId: string | null
}

export default function SamsejladsDetailClient({ rideShare: rs, reviews, currentUserId }: Props) {
  const router = useRouter()
  const [numSeats, setNumSeats] = useState(1)
  const [errorMsg, setErrorMsg] = useState("")
  const [isPending, startTransition] = useTransition()

  const isFull = rs.status === "full" || rs.seats_available === 0
  const isOwnTrip = currentUserId === rs.sejler_id
  const maxSeats = Math.min(rs.seats_available, 8)
  const totalOre = numSeats * rs.price_per_seat_ore
  const departure = new Date(rs.departure_at)

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : null

  function handleBook() {
    if (!currentUserId) {
      router.push(`/login?next=/samsejlads/${rs.id}`)
      return
    }
    setErrorMsg("")
    startTransition(async () => {
      try {
        const res = await fetch("/api/samsejlads/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ride_share_id: rs.id, seats_booked: numSeats }),
        })
        const data = await res.json() as { url?: string; error?: string }
        if (data.error) {
          setErrorMsg(data.error)
        } else if (data.url) {
          window.location.href = data.url
        }
      } catch {
        setErrorMsg("Der opstod en fejl. Prøv igen.")
      }
    })
  }

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header card */}
        <div className="bg-[#09192A] rounded-3xl p-6 sm:p-8 mb-6 text-white">
          <div className="flex items-start gap-3 mb-4">
            <Anchor className="w-5 h-5 text-[#4A9CC7] shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xl font-bold">{rs.from_location}</span>
                <ArrowRight className="w-4 h-4 text-[#4A9CC7] shrink-0" />
                <span className="text-xl font-bold">{rs.to_location}</span>
                {isFull && (
                  <Badge className="bg-gray-600 text-gray-200 border-0 text-xs">Fuldt booket</Badge>
                )}
              </div>
              <p className="text-white/60 text-sm mt-1">
                {format(departure, "EEEE d. MMMM yyyy 'kl.' HH:mm", { locale: da })}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-4">
            <div>
              <p className="text-white/50 text-xs mb-0.5">Pladser ledige</p>
              <p className="font-bold text-white flex items-center gap-1">
                <Users className="w-4 h-4 text-[#4A9CC7]" />
                {rs.seats_available} / {rs.total_seats}
              </p>
            </div>
            <div>
              <p className="text-white/50 text-xs mb-0.5">Pris pr. plads</p>
              <p className="font-bold text-white">{formatKr(rs.price_per_seat_ore)}</p>
            </div>
            {rs.boat_description && (
              <div>
                <p className="text-white/50 text-xs mb-0.5">Fartøj</p>
                <p className="font-bold text-white text-sm truncate flex items-center gap-1">
                  <Ship className="w-3.5 h-3.5 text-[#4A9CC7]" />
                  {rs.boat_description}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="grid sm:grid-cols-[1fr_300px] gap-6">
          {/* Left column */}
          <div className="space-y-6">
            {/* Description */}
            {rs.description && (
              <div className="bg-white rounded-2xl border border-border p-5">
                <h2 className="font-bold text-foreground mb-2 text-sm uppercase tracking-wide text-muted-foreground">Om turen</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{rs.description}</p>
              </div>
            )}

            {/* Sejler */}
            <div className="bg-white rounded-2xl border border-border p-5">
              <h2 className="font-bold text-foreground mb-3 text-sm uppercase tracking-wide text-muted-foreground">Din sejler</h2>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                  {rs.profiles?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={rs.profiles.avatar_url}
                      alt={rs.profiles?.full_name ?? "Sejler"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-5 h-5 text-primary/50" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    {rs.profiles?.full_name ?? "Sila-sejler"}
                  </p>
                  {avgRating !== null && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span className="text-xs font-medium text-foreground">{avgRating.toFixed(1)}</span>
                      <span className="text-xs text-muted-foreground">({reviews.length} anmeldelse{reviews.length !== 1 ? "r" : ""})</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Reviews */}
            {reviews.length > 0 && (
              <div className="bg-white rounded-2xl border border-border p-5">
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="font-bold text-foreground text-sm uppercase tracking-wide text-muted-foreground">Anmeldelser</h2>
                  {avgRating !== null && <StarBar stars={avgRating} count={reviews.length} />}
                </div>
                <div className="space-y-4">
                  {reviews.map((r) => (
                    <div key={r.id} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-foreground">
                            {r.profiles?.full_name ?? "Sila-gæst"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(r.created_at), "d. MMM yyyy", { locale: da })}
                          </p>
                        </div>
                        <StarBar stars={r.rating} />
                        {r.comment && (
                          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{r.comment}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Booking card (right column / bottom on mobile) */}
          <div className="sm:sticky sm:top-24 h-fit">
            <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
              <p className="font-bold text-foreground mb-1">{formatKr(rs.price_per_seat_ore)}</p>
              <p className="text-xs text-muted-foreground mb-4">pr. plads</p>

              {isFull ? (
                <div className="bg-muted rounded-xl p-4 text-center text-sm text-muted-foreground">
                  Denne tur er fuldt booket
                </div>
              ) : isOwnTrip ? (
                <div className="bg-muted rounded-xl p-4 text-center text-sm text-muted-foreground">
                  Dette er din tur
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <label className="text-sm font-medium text-foreground mb-1.5 block">
                      Antal pladser
                    </label>
                    <select
                      value={numSeats}
                      onChange={(e) => setNumSeats(Number(e.target.value))}
                      className="w-full text-sm bg-muted rounded-xl px-3 py-2.5 border-0 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      {Array.from({ length: Math.max(1, maxSeats) }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>
                          {n} plads{n !== 1 ? "er" : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-between text-sm mb-4 py-3 border-t border-border">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-bold text-foreground">{formatKr(totalOre)}</span>
                  </div>

                  {errorMsg && (
                    <div className="flex items-start gap-2 bg-destructive/10 rounded-xl p-3 mb-3 text-sm text-destructive">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      {errorMsg}
                    </div>
                  )}

                  <Button
                    onClick={handleBook}
                    disabled={isPending}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl gap-2"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sender...
                      </>
                    ) : !currentUserId ? (
                      "Log ind for at booke"
                    ) : (
                      "Book samsejlads"
                    )}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center mt-3">
                    Betaling via Stripe — du videresendes til sikker betalingsside
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
