"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import {
  Home, Calendar, Users, ChevronDown, Check, X,
  CreditCard, ArrowRight, User,
} from "lucide-react"
import { useFormatter } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatKr } from "@/lib/money"
import { confirmBooking, declineBooking } from "../actions"
import ReviewDialog from "@/components/reviews/ReviewDialog"
import { publishedCabinDetailPath } from "@/lib/cabinPublicPaths"

export const STATUS_COLORS: Record<string, string> = {
  pending:   "bg-amber-100 text-amber-700",
  confirmed: "bg-green-100 text-green-700",
  completed: "bg-blue-100 text-blue-700",
  cancelled: "bg-gray-100 text-gray-500",
}

export const STATUS_LABELS: Record<string, string> = {
  pending:   "Afventer",
  confirmed: "Bekræftet",
  completed: "Afsluttet",
  cancelled: "Annulleret",
}

export interface CabinBookingData {
  id: string
  cabin_id?: string
  status: string
  check_in: string
  check_out: string
  num_guests: number
  total_price_ore: number
  platform_fee_ore?: number | null
  stripe_payment_intent_id?: string | null
  guest_message: string | null
  created_at: string
  // joined data
  cabin_title?: string | null
  cabin_price_per_night_ore?: number | null
  guest_name?: string | null
  guest_id?: string | null
  guest_avatar_url?: string | null
  host_name?: string | null
  host_id?: string | null
  /** reviewee_id — cabin owner (guest view) or guest (host view) */
  reviewee_id?: string | null
  /** cabins.property_type for public URL */
  cabin_property_type?: string | null
}

interface Props {
  booking: CabinBookingData
  isHost: boolean
  alreadyReviewed?: boolean
}

export default function BookingRow({ booking, isHost, alreadyReviewed = false }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const fmt = useFormatter()

  function handleConfirm() {
    startTransition(async () => { await confirmBooking(booking.id) })
  }
  function handleDecline() {
    startTransition(async () => { await declineBooking(booking.id) })
  }

  const nights = (() => {
    const d = Math.round(
      (new Date(booking.check_out).getTime() - new Date(booking.check_in).getTime()) /
      (1000 * 60 * 60 * 24)
    )
    return d > 0 ? d : null
  })()

  const personName = isHost ? (booking.guest_name ?? "Gæst") : (booking.host_name ?? "Udbyder")
  const personId   = isHost ? booking.guest_id : booking.host_id
  const personRole = isHost ? "Gæst" : "Vært"
  const personAvatar = isHost ? booking.guest_avatar_url : null

  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden">

      {/* ── Header-række — klik toggler accordion ── */}
      <div
        role="button"
        tabIndex={0}
        className="w-full text-left p-4 sm:p-5 flex items-center gap-4 cursor-pointer select-none"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            setOpen((v) => !v)
          }
        }}
      >
        {/* Ikon */}
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-primary/10">
          <Home className="w-4 h-4 text-primary" />
        </div>

        {/* Titel + undertekst */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">
            {booking.cabin_title ?? "Hytte"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isHost
              ? `Fra: ${personName}`
              : `Booket ${fmt.dateTime(new Date(booking.created_at), { day: "numeric", month: "short", year: "numeric" })}`}
          </p>
        </div>

        {/* Højre: badge + pris + Se hytte + chevron */}
        <div className="flex items-center gap-2 shrink-0">
          <Badge
            className={`${STATUS_COLORS[booking.status] ?? "bg-gray-100 text-gray-500"} border-0 text-xs`}
          >
            {STATUS_LABELS[booking.status] ?? booking.status}
          </Badge>

          {booking.total_price_ore > 0 && (
            <span className="text-sm font-bold text-foreground hidden sm:inline">
              {formatKr(booking.total_price_ore)}
            </span>
          )}

          {booking.cabin_id && (
            <Link
              href={publishedCabinDetailPath(booking.cabin_property_type, booking.cabin_id)}
              className="hidden sm:inline-flex items-center gap-0.5 text-xs text-primary hover:underline font-medium"
              onClick={(e) => e.stopPropagation()}
            >
              Se hytte <ArrowRight className="w-3 h-3" />
            </Link>
          )}

          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </div>

      {/* ── Accordion-panel ── */}
      {open && (
        <div className="px-4 sm:px-5 pb-5 border-t border-border pt-4 space-y-3">

          {/* Person-kort: gæst (udbyder) eller vært (gæst) */}
          {personId ? (
            <Link
              href={`/profil/${personId}`}
              className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                {personAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={personAvatar} alt={personName} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-4 h-4 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">{personRole}</p>
                <p className="text-sm font-semibold text-foreground truncate">{personName}</p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-primary shrink-0" />
            </Link>
          ) : (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <User className="w-3.5 h-3.5" />
              {personRole}: {personName}
            </div>
          )}

          {/* Datoer + gæster */}
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {fmt.dateTime(new Date(booking.check_in), { day: "numeric", month: "short" })}
              {" – "}
              {fmt.dateTime(new Date(booking.check_out), { day: "numeric", month: "short", year: "numeric" })}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {booking.num_guests} gæst{booking.num_guests !== 1 ? "er" : ""}
            </span>
          </div>

          {/* Prisdetaljer */}
          <div className="bg-muted/50 rounded-xl p-3 space-y-1.5 text-xs text-muted-foreground">
            {booking.cabin_price_per_night_ore != null && nights != null && (
              <div className="flex justify-between">
                <span>{formatKr(booking.cabin_price_per_night_ore)} × {nights} nætter</span>
                <span>{formatKr(booking.cabin_price_per_night_ore * nights)}</span>
              </div>
            )}
            {booking.platform_fee_ore != null && booking.platform_fee_ore > 0 && (
              <div className="flex justify-between">
                <span>Platformsgebyr (5 %)</span>
                <span>{formatKr(booking.platform_fee_ore)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-foreground border-t border-border pt-1.5 mt-1">
              <span>Total</span>
              <span>{formatKr(booking.total_price_ore)}</span>
            </div>
          </div>

          {/* Stripe ID */}
          {booking.stripe_payment_intent_id && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CreditCard className="w-3.5 h-3.5 shrink-0" />
              Betaling: …{booking.stripe_payment_intent_id.slice(-8)}
            </div>
          )}

          {/* Se hytte — altid synlig i accordion (inkl. mobil) */}
          {booking.cabin_id && (
            <Link
              href={publishedCabinDetailPath(booking.cabin_property_type, booking.cabin_id)}
              className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
            >
              Se hytte <ArrowRight className="w-3 h-3" />
            </Link>
          )}

          {/* Besked fra gæst */}
          {booking.guest_message && (
            <p className="text-xs text-muted-foreground bg-muted rounded-lg p-2.5 italic">
              &ldquo;{booking.guest_message}&rdquo;
            </p>
          )}

          {/* Bekræft / afvis — kun udbyder + pending */}
          {isHost && booking.status === "pending" && (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleConfirm}
                disabled={isPending}
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg gap-1.5"
              >
                <Check className="w-3.5 h-3.5" /> Bekræft
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDecline}
                disabled={isPending}
                className="rounded-lg gap-1.5 text-destructive border-destructive/30 hover:bg-destructive hover:text-white"
              >
                <X className="w-3.5 h-3.5" /> Afvis
              </Button>
            </div>
          )}

          {/* Anmeld */}
          {booking.status === "completed" && booking.reviewee_id && (
            alreadyReviewed ? (
              <p className="text-xs text-muted-foreground italic">Allerede anmeldt</p>
            ) : (
              <ReviewDialog
                bookingId={booking.id}
                bookingType="cabin"
                revieweeId={booking.reviewee_id}
                reviewerRole={isHost ? "provider" : "guest"}
              />
            )
          )}
        </div>
      )}
    </div>
  )
}
