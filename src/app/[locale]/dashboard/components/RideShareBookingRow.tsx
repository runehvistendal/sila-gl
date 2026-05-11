"use client"

import { useState } from "react"
import Link from "next/link"
import { Ship, ChevronDown, Calendar, Users, ArrowRight, User } from "lucide-react"
import { useFormatter, useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { formatKr } from "@/lib/money"
import { getLocationName } from "@/lib/greenlandLocations"
import ReviewDialog from "@/components/reviews/ReviewDialog"
import { formatNuukFull } from "@/lib/nuukTime"
import { STATUS_COLORS, STATUS_LABELS } from "./BookingRow"

export interface RideShareBookingRowData {
  id: string
  status: string
  num_seats: number
  total_price_ore: number
  created_at: string
  from_location: string
  to_location: string
  departure_at: string
  other_name: string | null
  other_id: string | null
  reviewee_id: string | null
  isSkipperView: boolean
}

interface Props {
  booking: RideShareBookingRowData
  alreadyReviewed?: boolean
}

export default function RideShareBookingRow({ booking, alreadyReviewed = false }: Props) {
  const [open, setOpen] = useState(false)
  const fmt = useFormatter()
  const t = useTranslations("dashboard")
  const tc = useTranslations("common")

  const fromName = getLocationName(booking.from_location)
  const toName = getLocationName(booking.to_location)
  const title = `${fromName} → ${toName}`

  const personName =
    booking.other_name?.trim() ||
    (booking.isSkipperView ? t("booking_row_role_passenger") : t("booking_row_role_skipper"))
  const personId = booking.other_id
  const personRole = booking.isSkipperView ? t("booking_row_role_passenger") : t("booking_row_role_skipper")

  const departureLabel = formatNuukFull(booking.departure_at)

  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden">
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
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-primary/10">
          <Ship className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {booking.isSkipperView
              ? `${t("booking_row_role_passenger")}: ${personName}`
              : fmt.dateTime(new Date(booking.created_at), {
                  day:      "numeric",
                  month:    "short",
                  year:     "numeric",
                })}
          </p>
        </div>
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
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </div>

      {open && (
        <div className="px-4 sm:px-5 pb-5 border-t border-border pt-4 space-y-3">
          {personId ? (
            <Link
              href={`/profil/${personId}`}
              className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-primary" />
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

          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {departureLabel}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {booking.num_seats} {tc("seats")}
            </span>
          </div>

          <div className="bg-muted/50 rounded-xl p-3 space-y-1.5 text-xs text-muted-foreground">
            <div className="flex justify-between font-semibold text-foreground">
              <span>{tc("total")}</span>
              <span>{formatKr(booking.total_price_ore)}</span>
            </div>
          </div>

          {booking.status === "completed" && booking.reviewee_id && (
            alreadyReviewed ? (
              <p className="text-xs text-muted-foreground italic">{t("reviewed")}</p>
            ) : (
              <ReviewDialog
                bookingId={booking.id}
                bookingType="ride_share"
                revieweeId={booking.reviewee_id}
                reviewerRole={booking.isSkipperView ? "provider" : "guest"}
              />
            )
          )}
        </div>
      )}
    </div>
  )
}
