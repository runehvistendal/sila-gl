"use client"

import NextLink from "next/link"
import { Anchor, Inbox } from "lucide-react"
import { useFormatter, useLocale } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { getLocationName } from "@/lib/greenlandLocations"

export interface TransportRequestData {
  id: string
  from_location: string
  to_location: string
  desired_date: string
  num_passengers: number
  status: string
  description: string | null
  profiles: { full_name: string | null } | null
}

interface Props {
  nearby: TransportRequestData[]
  others: TransportRequestData[]
  userHomeCity: string | null
  type: "transport"
}

function RequestCard({ r, highlight, fmtDate }: { r: TransportRequestData; highlight?: boolean; fmtDate: (d: Date) => string }) {
  const locale = useLocale()
  const href = `/${locale}/transport/anmodninger/${r.id}`

  return (
    <NextLink
      href={href}
      onClick={() => console.log("[Gæsteønsker] transport detail URL:", href)}
      className={`block w-full text-left bg-white rounded-xl border p-4 ${
        highlight ? "border-primary/30 shadow-sm" : "border-border"
      } hover:shadow-md hover:border-primary/20 transition-all`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
            <Anchor className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm text-foreground">
              {getLocationName(r.from_location)} → {getLocationName(r.to_location)}
            </p>
            {r.profiles?.full_name && (
              <p className="text-xs text-muted-foreground mt-0.5">{r.profiles.full_name}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {r.desired_date ? fmtDate(new Date(r.desired_date)) : "—"}
              {r.num_passengers ? ` · ${r.num_passengers} passager${r.num_passengers !== 1 ? "er" : ""}` : ""}
            </p>
          </div>
        </div>
        <Badge className="bg-amber-100 text-amber-700 border-0 shrink-0 text-xs">
          Åben
        </Badge>
      </div>
    </NextLink>
  )
}

export default function OpenRequestsList({ nearby, others, userHomeCity, type }: Props) {
  const fmt = useFormatter()
  const fmtDate = (d: Date) => fmt.dateTime(d, { day: "numeric", month: "short", year: "numeric" })
  const total = nearby.length + others.length

  if (total === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-border">
        <Inbox className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground font-medium mb-1">Ingen åbne transportanmodninger</p>
        <p className="text-xs text-muted-foreground">Nye anmodninger vises her</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {nearby.length > 0 && userHomeCity && (
        <div>
          <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">
            Nær dig — {userHomeCity}
          </p>
          <div className="space-y-3">
            {nearby.map((r) => <RequestCard key={r.id} r={r} highlight fmtDate={fmtDate} />)}
          </div>
        </div>
      )}

      {others.length > 0 && (
        <div>
          {userHomeCity && nearby.length > 0 && (
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Andre regioner
            </p>
          )}
          <div className="space-y-3">
            {others.map((r) => <RequestCard key={r.id} r={r} fmtDate={fmtDate} />)}
          </div>
        </div>
      )}

      {!userHomeCity && (
        <div className="space-y-3">
          {[...nearby, ...others].map((r) => <RequestCard key={r.id} r={r} fmtDate={fmtDate} />)}
        </div>
      )}
    </div>
  )
}
