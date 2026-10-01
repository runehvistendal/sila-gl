"use client"

import { format } from "date-fns"
import { da } from "date-fns/locale"
import { Anchor, Calendar, Eye, Home, MapPin } from "lucide-react"
import { Link } from "@/i18n/navigation"
import { useTranslations } from "next-intl"
import type { MyCabinTransportRequestRow } from "@/app/actions/cabinTransportRequests"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getLocationName } from "@/lib/greenlandLocations"

const STATUS_LABELS: Record<string, string> = {
  open: "Åben",
  accepted: "Accepteret",
  expired: "Udløbet",
  cancelled: "Annulleret",
}

const STATUS_COLORS: Record<string, string> = {
  open: "bg-amber-100 text-amber-700",
  accepted: "bg-green-100 text-green-700",
  expired: "bg-gray-100 text-gray-400",
  cancelled: "bg-gray-100 text-gray-500",
}

function arrivalPointLabel(point: string, tCabins: (key: string) => string): string {
  if (point === "airport") return tCabins("booking_transport_arrival_airport")
  if (point === "harbour") return tCabins("booking_transport_arrival_harbour")
  if (point === "helipad") return tCabins("booking_transport_arrival_helipad")
  return point
}

type Props = {
  request: MyCabinTransportRequestRow
}

export default function MyCabinTransportRequestRow({ request }: Props) {
  const tCabins = useTranslations("cabins")
  const cabinTitle = request.cabins?.title ?? "Hytte"
  const hubLabel = request.cabins?.location_hub
    ? getLocationName(request.cabins.location_hub)
    : null
  const arrivalLabel = arrivalPointLabel(request.arrival_point, tCabins)
  const arrivalDateFmt =
    request.arrival_date != null && request.arrival_date !== ""
      ? format(new Date(`${request.arrival_date}T12:00:00`), "d. MMM yyyy", { locale: da })
      : "—"
  const offerCount = request.cabin_transport_offers?.length ?? 0
  const status = request.status ?? "open"

  return (
    <div className="bg-white rounded-xl border border-border p-4 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Home className="w-4 h-4 text-[#114788]" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-foreground">{cabinTitle}</p>
            {hubLabel != null && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 shrink-0" />
                {hubLabel}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 justify-end">
          <Badge
            variant="secondary"
            className="border-0 bg-muted text-foreground text-[10px] font-semibold uppercase tracking-wide"
          >
            {offerCount} bud
          </Badge>
          <Badge className={`${STATUS_COLORS[status] ?? "bg-gray-100 text-gray-500"} border-0 text-xs`}>
            {STATUS_LABELS[status] ?? status}
          </Badge>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Anchor className="w-3.5 h-3.5 shrink-0 text-[#114788]" />
          <span className="text-foreground font-medium">{arrivalLabel}</span>
        </span>
        <span className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5 shrink-0" />
          {arrivalDateFmt}
        </span>
        <span>
          {request.num_persons} person{request.num_persons !== 1 ? "er" : ""}
        </span>
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-border flex-wrap">
        <Button size="sm" asChild variant="outline" className="rounded-lg gap-1.5 text-[#114788] border-[#114788]/30 hover:bg-[#114788]/5">
          <Link href={`/dashboard/transport-anmodninger/${request.id}`}>
            <Eye className="w-3.5 h-3.5" /> Se bud
          </Link>
        </Button>
      </div>
    </div>
  )
}
