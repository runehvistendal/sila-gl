"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Calendar, Clock, Users, Anchor, User, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { createClient } from "@/lib/supabase"
import { formatKr, oreToKr } from "@/lib/money"
import { formatNuukDate, formatNuukTime } from "@/lib/nuukTime"
import { GREENLAND_LOCATIONS } from "@/lib/greenlandLocations"

const getLocationName = (id: string) =>
  GREENLAND_LOCATIONS.find((l) => l.name_dk.toLowerCase() === id.toLowerCase())
    ?.name_dk ?? id.charAt(0).toUpperCase() + id.slice(1)

interface RideShareDetail {
  id: string
  from_location: string
  to_location: string
  departure_at: string
  seats_available: number
  total_seats: number
  price_per_seat_ore: number
  boat_description: string | null
  description: string | null
  profiles: { full_name: string | null; avatar_url: string | null } | null
}

interface Props {
  /** ride_share id to show; null = drawer is closed */
  id: string | null
  /** Number of seats the user wants to book */
  seats: number
  onClose: () => void
}

export default function TransportDrawer({ id, seats, onClose }: Props) {
  const router = useRouter()

  const [data, setData] = useState<RideShareDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [bookPending, setBookPending] = useState(false)

  useEffect(() => {
    if (!id) {
      setData(null)
      return
    }
    setLoading(true)
    const supabase = createClient()
    supabase
      .from("ride_shares")
      .select(`
        id, from_location, to_location, departure_at,
        seats_available, total_seats, price_per_seat_ore,
        boat_description, description,
        profiles!skipper_id ( full_name, avatar_url )
      `)
      .eq("id", id)
      .in("status", ["active", "full"])
      .single()
      .then(({ data: row, error }) => {
        if (error) {
          toast.error("Kunne ikke hente turinfo. Prøv igen.")
          onClose()
        } else {
          setData(row as RideShareDetail)
        }
        setLoading(false)
      })
  // onClose intentionally omitted — stable ref not guaranteed from parent
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function handleBook() {
    if (!id || bookPending) return
    setBookPending(true)
    try {
      const res = await fetch("/api/transport/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ride_share_id: id, seats_booked: seats }),
      })
      const json = (await res.json()) as { url?: string; error?: string }
      if (res.status === 401) {
        toast.error("Log ind for at booke")
        router.push("/login")
        return
      }
      if (!res.ok || !json.url) {
        toast.error(json.error ?? "Noget gik galt. Prøv igen.")
        return
      }
      router.push(json.url)
    } catch {
      toast.error("Forbindelsesfejl. Prøv igen.")
    } finally {
      setBookPending(false)
    }
  }

  const totalOre = data ? seats * data.price_per_seat_ore : 0
  const fromName = data ? getLocationName(data.from_location) : ""
  const toName = data ? getLocationName(data.to_location) : ""
  const depTime = data ? formatNuukTime(data.departure_at) : null
  const notEnoughSeats = !!data && data.seats_available < seats

  return (
    <Sheet open={!!id} onOpenChange={(open) => { if (!open) onClose() }}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full sm:max-w-md flex flex-col p-0 overflow-y-auto"
      >
        {/* ── Header ── */}
        <SheetHeader className="flex-row items-center justify-between px-5 py-4 border-b border-border gap-3 shrink-0">
          <SheetTitle className="text-base font-bold flex items-center gap-1.5 flex-wrap leading-snug">
            <span className="text-muted-foreground font-normal">Returrejse</span>
            {data && (
              <>
                <span className="text-foreground">—</span>
                <span>{fromName}</span>
                <ArrowRight className="w-4 h-4 text-primary shrink-0" />
                <span>{toName}</span>
              </>
            )}
          </SheetTitle>
          <button
            onClick={onClose}
            aria-label="Luk"
            className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </SheetHeader>

        {/* ── Body ── */}
        <div className="flex-1 px-5 py-5 space-y-5">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          )}

          {!loading && data && (
            <>
              {/* Info chips — same pattern as /transport/[id] */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <Calendar className="w-3.5 h-3.5" />Dato
                  </div>
                  <p className="font-semibold text-sm">
                    {formatNuukDate(data.departure_at)}
                  </p>
                </div>

                {depTime && (
                  <div className="bg-muted rounded-xl p-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                      <Clock className="w-3.5 h-3.5" />Afgang
                    </div>
                    <p className="font-semibold text-sm">{depTime}</p>
                  </div>
                )}

                <div className="bg-muted rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <Users className="w-3.5 h-3.5" />Ledige pladser
                  </div>
                  <p className="font-semibold text-sm">{data.seats_available}</p>
                </div>

                {data.boat_description && (
                  <div className="bg-muted rounded-xl p-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                      <Anchor className="w-3.5 h-3.5" />Båd
                    </div>
                    <p className="font-semibold text-sm truncate">
                      {data.boat_description}
                    </p>
                  </div>
                )}
              </div>

              {/* Provider */}
              {data.profiles && (
                <div className="flex items-center gap-3 p-4 bg-muted/40 rounded-2xl">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                    {data.profiles.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={data.profiles.avatar_url}
                        alt={data.profiles.full_name ?? "Sila-sejler"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Sejler</p>
                    <p className="text-sm font-semibold text-foreground">
                      {data.profiles.full_name ?? "Sila-sejler"}
                    </p>
                  </div>
                </div>
              )}

              {/* Amber warning — separate sejler, to separate receipts */}
              <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-4">
                <span className="text-amber-500 text-base leading-none mt-0.5">⚠️</span>
                <p className="text-sm text-amber-800 leading-relaxed">
                  <strong>Bemærk:</strong> Denne tur udbydes af en anden sejler.{" "}
                  Denne booking gælder kun transport til {toName}.{" "}
                  Husk stadig at gennemføre den anden booking.{" "}
                  Du modtager to separate betalingskvitteringer.
                </p>
              </div>

              {/* Price summary */}
              <div className="bg-muted rounded-xl p-4 text-sm space-y-1.5">
                <div className="flex justify-between text-muted-foreground">
                  <span>
                    {oreToKr(data.price_per_seat_ore).toLocaleString("da-DK")} kr.{" "}
                    × {seats} plads{seats !== 1 ? "er" : ""}
                  </span>
                  <span>{formatKr(totalOre)}</span>
                </div>
                <div className="flex justify-between font-bold text-foreground pt-1.5 border-t border-border">
                  <span>Total</span>
                  <span>{formatKr(totalOre)}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Footer ── */}
        {!loading && data && (
          <div className="px-5 pb-6 pt-3 space-y-2 border-t border-border shrink-0">
            <Button
              onClick={handleBook}
              disabled={bookPending || notEnoughSeats}
              className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-semibold"
            >
              {bookPending
                ? "Åbner betaling…"
                : notEnoughSeats
                  ? `Kun ${data.seats_available} plads${data.seats_available !== 1 ? "er" : ""} tilbage`
                  : `Book denne returtur — ${formatKr(totalOre)}`}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Sikker betaling via Stripe
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
