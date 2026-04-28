"use client"

import Link from "next/link"
import { ArrowRight, ArrowLeft, Calendar, Users, Anchor, User } from "lucide-react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { formatKr, oreToKr } from "@/lib/money"

const FALLBACK_BOAT = "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&h=400&fit=crop&q=80"

export interface ReturnTripData {
  id: string
  from_location: string
  to_location: string
  departure_at: string
  seats_available: number
  price_per_seat_ore: number
  status: string
}

export interface RideShareCardData {
  id: string
  sejler_id: string | null
  from_location: string
  to_location: string
  departure_at: string
  seats_available: number
  total_seats: number
  price_per_seat_ore: number
  boat_description: string | null
  description: string | null
  status: string
  from_latitude?: number | null
  from_longitude?: number | null
  to_latitude?: number | null
  to_longitude?: number | null
  return_ride_share_id?: string | null
  return_trip?: ReturnTripData | null
  profiles: { full_name: string | null; avatar_url: string | null } | null
}

interface Props {
  rideShare: RideShareCardData
  returnTrip?: RideShareCardData | null
}

export default function TransportCard({ rideShare, returnTrip: returnTripProp = null }: Props) {
  // Prefer explicit DB-linked return trip, fall back to heuristically found one
  const returnTrip: ReturnTripData | null = rideShare.return_trip ?? returnTripProp ?? null
  const skipper = rideShare.profiles

  return (
    <div className="bg-white rounded-2xl border border-border shadow-card hover:shadow-card-hover hover:border-primary/30 transition-all flex flex-col h-full p-5">
      {/* Image — always Unsplash fallback (no images column) */}
      <div className="relative overflow-hidden rounded-lg aspect-video mb-4 bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={FALLBACK_BOAT}
          alt={rideShare.boat_description ?? "båd"}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Route + price header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
          {skipper?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={skipper.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <User className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 font-semibold text-foreground text-sm">
            <span className="truncate">{rideShare.from_location}</span>
            <ArrowRight className="w-4 h-4 text-primary shrink-0" />
            <span className="truncate">{rideShare.to_location}</span>
          </div>
          {skipper?.full_name && (
            <p className="text-xs text-muted-foreground mt-0.5">Sejler: {skipper.full_name}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          {returnTrip ? (
            <>
              <p className="font-bold text-foreground text-sm">
                fra {oreToKr(rideShare.price_per_seat_ore).toLocaleString("da-DK")} kr.
              </p>
              <p className="text-xs text-green-700 font-medium">
                / {oreToKr(rideShare.price_per_seat_ore + returnTrip.price_per_seat_ore).toLocaleString("da-DK")} kr. t/r
              </p>
            </>
          ) : (
            <>
              <p className="font-bold text-foreground text-sm">{formatKr(rideShare.price_per_seat_ore)}</p>
              <p className="text-xs text-muted-foreground">pr. person</p>
            </>
          )}

        </div>
      </div>

      {/* Detail pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        <span className="inline-flex items-center gap-1.5 text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-full">
          <Calendar className="w-3 h-3" />
          {format(new Date(rideShare.departure_at), "d. MMM yyyy")}
        </span>
        <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${
          rideShare.seats_available > 0
            ? "bg-green-100 text-green-700"
            : "bg-destructive/10 text-destructive"
        }`}>
          <Users className="w-3 h-3" />
          {rideShare.seats_available} plads{rideShare.seats_available !== 1 ? "er" : ""} tilbage
        </span>
        {rideShare.boat_description && (
          <span className="inline-flex items-center gap-1.5 text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-full">
            <Anchor className="w-3 h-3" />
            {rideShare.boat_description.length > 20
              ? rideShare.boat_description.slice(0, 20) + "…"
              : rideShare.boat_description}
          </span>
        )}
      </div>

      {/* Return trip badge */}
      <div className="mb-4 min-h-[2rem] flex items-start">
        {returnTrip ? (
          <span className="inline-flex items-center gap-1.5 text-xs bg-green-50 border border-green-200 text-green-700 px-2.5 py-1 rounded-full font-medium">
            <ArrowLeft className="w-3 h-3 shrink-0" />
            Retur: {format(new Date(returnTrip.departure_at), "d. MMM")} · {returnTrip.seats_available} plads{returnTrip.seats_available !== 1 ? "er" : ""}
          </span>
        ) : (
          <div className="min-h-[2rem]" />
        )}
      </div>

      {/* CTA */}
      <div className="mt-auto">
        <Button
          variant="outline"
          size="sm"
          asChild
          className="w-full rounded-xl border-primary/30 text-primary hover:bg-primary hover:text-white transition-colors"
        >
          <Link href={`/transport/${rideShare.id}`}>Se og book</Link>
        </Button>
      </div>
    </div>
  )
}
