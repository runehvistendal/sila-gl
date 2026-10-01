"use client"

import { useState, useTransition } from "react"
import { format } from "date-fns"
import { da } from "date-fns/locale"
import { Anchor, Calendar, Home, MapPin, User } from "lucide-react"
import { useTranslations } from "next-intl"
import {
  createCabinTransportOffer,
  type OpenCabinTransportRequestRow,
} from "@/app/actions/cabinTransportRequests"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import TransportMiniStaticMap from "@/components/map/TransportMiniStaticMap"
import { getLocationCoordinates, getLocationName } from "@/lib/greenlandLocations"

function expiresInHoursLabel(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now()
  if (ms <= 0) return "Udløbet"
  const hours = Math.ceil(ms / (60 * 60 * 1000))
  if (hours <= 1) return "mindre end 1 time"
  return hours === 1 ? "1 time" : `${hours} timer`
}

function arrivalPointLabel(point: string, tCabins: (key: string) => string): string {
  if (point === "airport") return tCabins("booking_transport_arrival_airport")
  if (point === "harbour") return tCabins("booking_transport_arrival_harbour")
  if (point === "helipad") return tCabins("booking_transport_arrival_helipad")
  return point
}

type Props = {
  request: OpenCabinTransportRequestRow
  onOfferSent?: () => void
}

export default function CabinTransportRequestRow({ request, onOfferSent }: Props) {
  const tCabins = useTranslations("cabins")
  const tDash = useTranslations("dashboard")
  const [showForm, setShowForm] = useState(false)
  const [sentOk, setSentOk] = useState(false)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [priceInput, setPriceInput] = useState("")
  const [message, setMessage] = useState("")
  const [pending, startTransition] = useTransition()

  const cabinTitle = request.cabins?.title ?? "Hytte"
  const hubKey = request.cabins?.location_hub ?? null
  const hubCoords = hubKey ? getLocationCoordinates(hubKey) : null
  const hubLabel = hubKey ? getLocationName(hubKey) : "—"
  const arrivalLabel = arrivalPointLabel(request.arrival_point, tCabins)
  const arrivalDateFmt =
    request.arrival_date != null && request.arrival_date !== ""
      ? format(new Date(`${request.arrival_date}T12:00:00`), "d. MMM yyyy", { locale: da })
      : "—"

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setFieldError(null)
    const kr = Number(String(priceInput).replace(",", ".").trim())
    if (!Number.isFinite(kr) || kr < 1) {
      setFieldError("Angiv et bud på mindst 1 kr.")
      return
    }
    const msgTrim = message.trim()
    if (msgTrim.length > 500) {
      setFieldError("Beskeden må højst være 500 tegn.")
      return
    }

    startTransition(async () => {
      const res = await createCabinTransportOffer(
        request.id,
        kr,
        msgTrim === "" ? null : msgTrim,
      )
      if ("error" in res) {
        setFieldError(res.error)
        return
      }
      setSentOk(true)
      setShowForm(false)
      onOfferSent?.()
    })
  }

  return (
    <div className="relative bg-white rounded-xl border border-border p-4 space-y-3">
      <Badge className="absolute top-3 right-3 z-10 bg-amber-100 text-amber-700 border border-amber-200/70 shadow-sm text-xs pointer-events-none">
        {request.status === "open"
          ? tDash("guest_wishes_transport_status_active")
          : request.status}
      </Badge>
      <div className="flex items-start gap-3 min-w-0 pr-16">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Home className="w-4 h-4 text-[#114788]" />
        </div>
        <div className="min-w-0">
          {request.profiles?.full_name != null && request.profiles.full_name !== "" && (
            <span className="text-xs text-muted-foreground font-medium block flex items-center gap-1">
              <User className="w-3 h-3 shrink-0" />
              {request.profiles.full_name}
            </span>
          )}
          <p className="font-semibold text-sm text-foreground">{cabinTitle}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3 shrink-0" />
            {hubLabel}
          </p>
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

      <p className="text-xs text-muted-foreground">
        Udløber om <span className="font-semibold text-foreground">{expiresInHoursLabel(request.expires_at)}</span>
      </p>

      {request.message != null && request.message.trim() !== "" && (
        <p className="text-xs text-muted-foreground italic bg-muted/50 rounded-lg px-3 py-2">
          &ldquo;{request.message}&rdquo;
        </p>
      )}

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
            <form onSubmit={submit} className="space-y-3 pt-2 border-t border-border">
              {hubCoords ? (
                <TransportMiniStaticMap
                  markerLng={hubCoords.longitude}
                  markerLat={hubCoords.latitude}
                />
              ) : null}
              <div className="space-y-1.5">
                <Label htmlFor={`ctp-${request.id}-price`} className="text-xs font-medium">
                  Pris (kr)
                </Label>
                <Input
                  id={`ctp-${request.id}-price`}
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
                <Label htmlFor={`ctp-${request.id}-msg`} className="text-xs font-medium">
                  Besked til gæst (valgfrit)
                </Label>
                <Textarea
                  id={`ctp-${request.id}-msg`}
                  rows={3}
                  maxLength={500}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="rounded-lg resize-y min-h-[80px]"
                  disabled={pending}
                  placeholder="Kort besked om dit tilbud…"
                />
                <p className="text-[10px] text-muted-foreground">{message.length}/500</p>
              </div>
              {fieldError != null && (
                <p className="text-sm text-destructive" role="alert">
                  {fieldError}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
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
              </div>
            </form>
          )}
        </>
      )}
    </div>
  )
}
