"use client"

import { useState } from "react"
import {
  Home, Calendar, Users, ChevronDown,
  CreditCard, ArrowRight, User, Ship,
} from "lucide-react"
import { useFormatter, useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { getLocationName } from "@/lib/greenlandLocations"
import { nuukTodayYmd } from "@/lib/nuukTime"
import { Badge } from "@/components/ui/badge"
import { formatKr } from "@/lib/money"
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
  /** Gæstens servicegebyr (12 %) — lægges oven i total_price_ore i gæstevisning */
  service_fee_ore?: number
  cabin_location_hub?: string | null
  /** Gæstevisning: hytte i naturen uden transfer eller transport på bookingen */
  needs_transport?: boolean
}

interface Props {
  booking: CabinBookingData
  isHost: boolean
  alreadyReviewed?: boolean
}

export default function BookingRow({ booking, isHost, alreadyReviewed = false }: Props) {
  const [open, setOpen] = useState(false)
  const fmt = useFormatter()
  const t = useTranslations("dashboard")

  // Datoer er rene kalenderdatoer — formatér i UTC, så de ikke rykker en dag
  const day = (ymd: string, withYear = false) =>
    fmt.dateTime(new Date(`${ymd.slice(0, 10)}T12:00:00Z`), {
      timeZone: "UTC", day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}),
    })
  const stayLabel = `${day(booking.check_in)} – ${day(booking.check_out, true)}`

  // Gæsten betalte udbyderens pris + servicegebyr; værten ser sin egen pris
  const serviceFee = !isHost ? booking.service_fee_ore ?? 0 : 0
  const shownTotal = booking.total_price_ore + serviceFee

  const isUpcoming = booking.check_in >= nuukTodayYmd()
  const showTransportHint =
    !isHost && booking.needs_transport && booking.status === "confirmed" && isUpcoming && booking.cabin_location_hub
  const transportHref = showTransportHint
    ? `/transport/anmod?${new URLSearchParams({
        to: getLocationName(booking.cabin_location_hub as string),
        date: booking.check_in,
        return: booking.check_out,
        guests: String(booking.num_guests),
        booking: booking.id,
      }).toString()}`
    : null

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
            {isHost ? `${personName} · ${stayLabel}` : stayLabel}
          </p>
        </div>

        {/* Højre: badge + pris + Se hytte + chevron */}
        <div className="flex items-center gap-2 shrink-0">
          <Badge
            className={`${STATUS_COLORS[booking.status] ?? "bg-gray-100 text-gray-500"} border-0 text-xs`}
          >
            {STATUS_LABELS[booking.status] ?? booking.status}
          </Badge>

          {shownTotal > 0 && (
            <span className="text-sm font-bold text-foreground hidden sm:inline">
              {formatKr(shownTotal)}
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
              {stayLabel}
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
            {serviceFee > 0 && (
              <div className="flex justify-between">
                <span>{t("booking_row_service_fee")}</span>
                <span>{formatKr(serviceFee)}</span>
              </div>
            )}
            {isHost && booking.platform_fee_ore != null && booking.platform_fee_ore > 0 && (
              <div className="flex justify-between">
                <span>Platformsgebyr (5 %)</span>
                <span>{formatKr(booking.platform_fee_ore)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-foreground border-t border-border pt-1.5 mt-1">
              <span>Total</span>
              <span>{formatKr(shownTotal)}</span>
            </div>
          </div>

          {/* Hytte i naturen uden transport på bookingen */}
          {transportHref && (
            <div className="rounded-xl border border-[#114788]/25 bg-[#114788]/5 p-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Ship className="w-4 h-4 text-[#114788]" aria-hidden />
                {t("booking_row_transport_title")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{t("booking_row_transport_body")}</p>
              <Link
                href={transportHref}
                className="mt-2 inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#114788] px-4 text-xs font-semibold text-white hover:bg-[#114788]/90"
              >
                {t("booking_row_transport_cta")} <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          )}

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
            <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
              Gæsten er i gang med at betale. Bookingen bekræftes automatisk, når betalingen går igennem —
              ellers frigives datoerne efter 35 minutter.
            </p>
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
