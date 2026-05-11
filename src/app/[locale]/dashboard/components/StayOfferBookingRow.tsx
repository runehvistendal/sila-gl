"use client"

import { useState } from "react"
import { Home, ChevronDown, Calendar, Users } from "lucide-react"
import { useFormatter, useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"

export interface StayOfferBookingRowData {
  id: string
  status: string
  cabin_title: string | null
  desired_check_in: string
  desired_check_out: string
  num_guests: number
}

interface Props {
  booking: StayOfferBookingRowData
}

const ACCEPT_BADGE = "bg-green-100 text-green-700"

export default function StayOfferBookingRow({ booking }: Props) {
  const [open, setOpen] = useState(false)
  const fmt = useFormatter()
  const t = useTranslations("dashboard")
  const tc = useTranslations("common")

  const title =
    booking.cabin_title?.trim() ||
    t("stay_offer_booking_row_title")

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
          <Home className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("bookings_section_stay_offer_booking")}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge className={`${ACCEPT_BADGE} border-0 text-xs`}>
            {t("stay_offers_status_accepted")}
          </Badge>
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </div>

      {open && (
        <div className="px-4 sm:px-5 pb-5 border-t border-border pt-4 space-y-3">
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {fmt.dateTime(new Date(booking.desired_check_in + "T12:00:00.000Z"), {
                day:      "numeric",
                month:    "short",
              })}
              {" – "}
              {fmt.dateTime(new Date(booking.desired_check_out + "T12:00:00.000Z"), {
                day:      "numeric",
                month:    "short",
                year:     "numeric",
              })}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {booking.num_guests} {tc("guests")}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
