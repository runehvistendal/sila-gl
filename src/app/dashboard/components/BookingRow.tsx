"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { Home, Anchor, Calendar, Users, ChevronRight, Check, X } from "lucide-react"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatKr } from "@/lib/money"
import { confirmBooking, declineBooking } from "../actions"

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
  guest_message: string | null
  created_at: string
  // joined data
  cabin_title?: string | null
  guest_name?: string | null
}

interface Props {
  booking: CabinBookingData
  isHost: boolean
}

export default function BookingRow({ booking, isHost }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    startTransition(async () => { await confirmBooking(booking.id) })
  }
  function handleDecline() {
    startTransition(async () => { await declineBooking(booking.id) })
  }

  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden">
      <div
        role="button"
        tabIndex={0}
        className="w-full text-left p-4 sm:p-5 flex items-start justify-between gap-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            setExpanded((v) => !v)
          }
        }}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-primary/10">
            <Home className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            {booking.cabin_id ? (
              <Link
                href={`/hytter/${booking.cabin_id}`}
                className="font-semibold text-sm text-foreground truncate hover:text-primary hover:underline block"
                onClick={(e) => e.stopPropagation()}
              >
                {booking.cabin_title ?? "Hytte"}
              </Link>
            ) : (
              <p className="font-semibold text-sm text-foreground truncate">
                {booking.cabin_title ?? "Hytte"}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">
              {isHost
                ? `Fra: ${booking.guest_name ?? "Gæst"}`
                : `Booket ${format(new Date(booking.created_at), "d. MMM yyyy")}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge className={`${STATUS_COLORS[booking.status] ?? "bg-gray-100 text-gray-500"} border-0 text-xs`}>
            {STATUS_LABELS[booking.status] ?? booking.status}
          </Badge>
          {booking.total_price_ore > 0 && (
            <span className="text-sm font-bold text-foreground">
              {formatKr(booking.total_price_ore)}
            </span>
          )}
          <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`} />
        </div>
      </div>

      {expanded && (
        <div className="px-4 sm:px-5 pb-5 border-t border-border pt-4 space-y-3">
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {format(new Date(booking.check_in), "d. MMM")}
              {" – "}
              {format(new Date(booking.check_out), "d. MMM yyyy")}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {booking.num_guests} gæst{booking.num_guests !== 1 ? "er" : ""}
            </span>
          </div>

          {booking.guest_message && (
            <p className="text-xs text-muted-foreground bg-muted rounded-lg p-2.5 italic">
              &ldquo;{booking.guest_message}&rdquo;
            </p>
          )}

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
        </div>
      )}
    </div>
  )
}
