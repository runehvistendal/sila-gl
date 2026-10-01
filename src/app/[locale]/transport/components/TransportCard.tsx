"use client"

import { useFormatter, useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { ArrowLeft, Anchor, User, Users } from "lucide-react"
import { formatKr, calcDisplayPrice } from "@/lib/money"
import { getLocationName } from "@/lib/greenlandLocations"
import { captureEvent } from "@/lib/analytics/posthog-events"

const NUUK_TZ = "America/Godthab"

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
  boats?: { name: string | null; images: string[] | null } | null
  profiles: { full_name: string | null; avatar_url: string | null } | null
}

interface Props {
  rideShare: RideShareCardData
  returnTrip?: RideShareCardData | null
  resultIndex?: number
}

export default function TransportCard({
  rideShare,
  returnTrip: returnTripProp = null,
  resultIndex = 0,
}: Props) {
  const t = useTranslations("transport")
  const fmt = useFormatter()
  // Prefer explicit DB-linked return trip, fall back to heuristically found one
  const returnTrip: ReturnTripData | null = rideShare.return_trip ?? returnTripProp ?? null
  const sailor = rideShare.profiles
  const boatImage = rideShare.boats?.images?.[0] ?? null
  const boatLabel = rideShare.boats?.name || rideShare.boat_description
  const soldOut = rideShare.seats_available <= 0

  const dep = new Date(rideShare.departure_at)
  const dateLabel = fmt.dateTime(dep, { timeZone: NUUK_TZ, weekday: "short", day: "numeric", month: "short" })
  const timeLabel = fmt.dateTime(dep, { timeZone: NUUK_TZ, hour: "2-digit", minute: "2-digit" })
  const fromName = getLocationName(rideShare.from_location)
  const toName = getLocationName(rideShare.to_location)

  return (
    <Link
      href={`/transport/${rideShare.id}`}
      onClick={() =>
        captureEvent("search_result_clicked", {
          type: "transport",
          listing_id: rideShare.id,
          position_in_results: resultIndex,
        })
      }
      className="group bg-white rounded-2xl border border-border shadow-card hover:shadow-card-hover hover:border-[#114788]/40 transition-all flex flex-col h-full overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#114788]"
    >
      {/* Rute-banner: bådens eget billede hvis det findes, ellers Silas farver. Ingen stockfotos. */}
      <div className="relative bg-gradient-to-br from-[#09192A] to-[#114788] text-white px-5 pt-5 pb-4">
        {boatImage && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={boatImage} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-[#09192A]/70" aria-hidden />
          </>
        )}
        <div className="relative">
          <p className="text-xs font-medium text-white/75 first-letter:uppercase">
            {dateLabel} · {timeLabel}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-lg font-bold leading-tight min-w-0 truncate">{fromName}</span>
            <span className="flex flex-1 items-center gap-1 min-w-6" aria-hidden>
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              <span className="h-px flex-1 border-t border-dashed border-white/60" />
              <Anchor className="h-3.5 w-3.5 text-[#4A9CC7]" />
              <span className="h-px flex-1 border-t border-dashed border-white/60" />
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
            </span>
            <span className="sr-only">{t("to")}</span>
            <span className="text-lg font-bold leading-tight min-w-0 truncate text-right">{toName}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
            {sailor?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={sailor.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {sailor?.full_name ?? t("sailor_fallback")}
            </p>
            {boatLabel && <p className="text-xs text-muted-foreground truncate">{boatLabel}</p>}
          </div>
          <div className="text-right shrink-0">
            <p className="font-bold text-foreground tabular-nums">
              {formatKr(calcDisplayPrice(rideShare.price_per_seat_ore))}
            </p>
            <p className="text-xs text-muted-foreground">{t("price_per_seat")}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
              soldOut ? "bg-muted text-muted-foreground" : "bg-green-100 text-green-800"
            }`}
          >
            <Users className="w-3 h-3" aria-hidden />
            {soldOut ? t("sold_out") : t("seats_available", { count: rideShare.seats_available })}
          </span>
          {returnTrip && (
            <span className="inline-flex items-center gap-1.5 text-xs bg-muted text-foreground px-2.5 py-1 rounded-full first-letter:uppercase">
              <ArrowLeft className="w-3 h-3 shrink-0" aria-hidden />
              {t("card_return", {
                date: fmt.dateTime(new Date(returnTrip.departure_at), { timeZone: NUUK_TZ, day: "numeric", month: "short" }),
              })}
            </span>
          )}
        </div>

        <span className="mt-auto pt-4 text-sm font-semibold text-[#114788] group-hover:underline">
          {soldOut ? t("card_cta_sold_out") : t("card_cta")}
        </span>
      </div>
    </Link>
  )
}
