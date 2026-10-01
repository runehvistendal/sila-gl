"use client"

import NextLink from "next/link"
import { useState, useTransition } from "react"
import { Anchor, Inbox, User } from "lucide-react"
import { useFormatter, useLocale, useTranslations } from "next-intl"
import { submitTransportOffer } from "@/app/[locale]/transport/anmodninger/[id]/actions"
import TransportMiniStaticMap from "@/components/map/TransportMiniStaticMap"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { getLocationCoordinates, getLocationName } from "@/lib/greenlandLocations"
import { timeWindowLabel } from "@/lib/transportRequestTime"

export interface TransportRequestData {
  id: string
  from_location: string
  to_location: string
  desired_date: string
  num_passengers: number
  status: string
  description: string | null
  preferred_time_from?: string | null
  preferred_time_to?: string | null
  profiles: { full_name: string | null } | null
}


interface Props {
  nearby: TransportRequestData[]
  others: TransportRequestData[]
  userHomeCity: string | null
  type: "transport"
  onOfferSubmitted?: () => void
}

function RequestCard({
  r,
  highlight,
  fmtDate,
  onOfferSubmitted,
}: {
  r: TransportRequestData
  highlight?: boolean
  fmtDate: (d: Date) => string
  onOfferSubmitted?: () => void
}) {
  const locale = useLocale()
  const tDash = useTranslations("dashboard")
  const detailHref = `/${locale}/transport/anmodninger/${r.id}`
  const [showForm, setShowForm] = useState(false)
  const [sentOk, setSentOk] = useState(false)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [priceInput, setPriceInput] = useState("")
  const [note, setNote] = useState("")
  const [pending, startTransition] = useTransition()

  const fromCoord = getLocationCoordinates(r.from_location)
  const toCoord = getLocationCoordinates(r.to_location)
  const showRouteMap = Boolean(fromCoord && toCoord)

  const numSeats = Math.min(Math.max(Math.floor(r.num_passengers) || 1, 1), 50)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setFieldError(null)
    const kr = Number(String(priceInput).replace(",", ".").trim())
    if (!Number.isFinite(kr) || kr < 1) {
      setFieldError("Angiv et bud på mindst 1 kr.")
      return
    }
    const noteTrim = note.trim()
    if (noteTrim.length > 500) {
      setFieldError("Noten må højst være 500 tegn.")
      return
    }

    startTransition(async () => {
      const res = await submitTransportOffer({
        requestId: r.id,
        priceKr: kr,
        numSeats,
        note: noteTrim === "" ? undefined : noteTrim,
      })
      if ("error" in res) {
        setFieldError(res.error)
        return
      }
      setSentOk(true)
      setShowForm(false)
      setPriceInput("")
      setNote("")
      onOfferSubmitted?.()
    })
  }

  return (
    <div
      className={`relative bg-white rounded-xl border border-border p-4 space-y-3 ${
        highlight ? "border-primary/30 shadow-sm" : ""
      }`}
    >
      <Badge className="absolute top-3 right-3 z-10 bg-amber-100 text-amber-700 border border-amber-200/70 shadow-sm text-xs pointer-events-none">
        {r.status === "open"
          ? tDash("guest_wishes_transport_status_active")
          : r.status}
      </Badge>
      <div className="flex items-start gap-3 min-w-0 pr-16">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Anchor className="w-4 h-4 text-[#114788]" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm text-foreground">
            {getLocationName(r.from_location)} → {getLocationName(r.to_location)}
          </p>
          {r.profiles?.full_name != null && r.profiles.full_name !== "" && (
            <span className="text-xs text-muted-foreground font-medium block flex items-center gap-1 mt-0.5">
              <User className="w-3 h-3 shrink-0" />
              {r.profiles.full_name}
            </span>
          )}
          <p className="text-xs text-muted-foreground mt-0.5">
            {r.desired_date ? fmtDate(new Date(r.desired_date)) : "—"}
            {r.num_passengers
              ? ` · ${r.num_passengers} passager${r.num_passengers !== 1 ? "er" : ""}`
              : ""}
            {timeWindowLabel(r.preferred_time_from, r.preferred_time_to)
              ? ` · ${timeWindowLabel(r.preferred_time_from, r.preferred_time_to)}`
              : ""}
          </p>
        </div>
      </div>

      {sentOk ? (
        <p className="text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
          Dit bud er sendt.
        </p>
      ) : (
        <>
          {!showForm ? (
            <Button
              type="button"
              size="sm"
              className="rounded-lg bg-[#114788] text-white hover:bg-[#114788]/90"
              onClick={() => {
                setShowForm(true)
                setFieldError(null)
              }}
            >
              Afgiv bud
            </Button>
          ) : (
            <div className="space-y-3 pt-2 border-t border-border">
              {showRouteMap && fromCoord && toCoord ? (
                <TransportMiniStaticMap
                  routeFromLng={fromCoord.longitude}
                  routeFromLat={fromCoord.latitude}
                  routeToLng={toCoord.longitude}
                  routeToLat={toCoord.latitude}
                />
              ) : null}

              <form onSubmit={submit} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor={`tor-${r.id}-price`} className="text-xs font-medium">
                    Pris (kr)
                  </Label>
                  <Input
                    id={`tor-${r.id}-price`}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    step={1}
                    required
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value)}
                    className="rounded-lg max-w-[11rem]"
                    disabled={pending}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`tor-${r.id}-note`} className="text-xs font-medium">
                    Note (valgfrit)
                  </Label>
                  <Textarea
                    id={`tor-${r.id}-note`}
                    rows={3}
                    maxLength={500}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="rounded-lg resize-y min-h-[80px]"
                    disabled={pending}
                    placeholder="Kort note til gæsten…"
                  />
                  <p className="text-[10px] text-muted-foreground">{note.length}/500</p>
                </div>
                {fieldError != null && (
                  <p className="text-sm text-destructive" role="alert">
                    {fieldError}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 items-center">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={pending}
                    className="rounded-lg bg-[#114788] text-white hover:bg-[#114788]/90"
                  >
                    {pending ? "Sender…" : "Send bud"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-lg"
                    disabled={pending}
                    onClick={() => {
                      setShowForm(false)
                      setFieldError(null)
                    }}
                  >
                    Annuller
                  </Button>
                  <NextLink
                    href={detailHref}
                    className="text-xs font-medium text-[#114788] hover:underline ml-auto"
                  >
                    Se fuld anmodning →
                  </NextLink>
                </div>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function OpenRequestsList({
  nearby,
  others,
  userHomeCity,
  type: _type,
  onOfferSubmitted,
}: Props) {
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
            {nearby.map((r) => (
              <RequestCard
                key={r.id}
                r={r}
                highlight
                fmtDate={fmtDate}
                onOfferSubmitted={onOfferSubmitted}
              />
            ))}
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
            {others.map((r) => (
              <RequestCard key={r.id} r={r} fmtDate={fmtDate} onOfferSubmitted={onOfferSubmitted} />
            ))}
          </div>
        </div>
      )}

      {!userHomeCity && (
        <div className="space-y-3">
          {[...nearby, ...others].map((r) => (
            <RequestCard key={r.id} r={r} fmtDate={fmtDate} onOfferSubmitted={onOfferSubmitted} />
          ))}
        </div>
      )}
    </div>
  )
}
