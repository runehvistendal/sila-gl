"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "@/i18n/navigation"
import { useLocale, useTranslations } from "next-intl"
import { format } from "date-fns"
import { da, enGB } from "date-fns/locale"
import { Anchor, Calendar, Home, Loader2, User } from "lucide-react"
import { acceptCabinTransportOffer } from "@/app/actions/cabinTransportRequests"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { oreToKr } from "@/lib/money"
import { toast } from "sonner"

export type TransportAnmodningRequestVM = {
  id: string
  arrival_point: string
  arrival_date: string
  num_persons: number
  message: string | null
  status: string
  expires_at: string
  cabin_title: string
}

export type TransportAnmodningOfferVM = {
  id: string
  price_ore: number
  message: string | null
  status: string
  created_at: string
  provider_full_name: string | null
}

const REQUEST_STATUS_COLORS: Record<string, string> = {
  open: "bg-amber-100 text-amber-700",
  accepted: "bg-emerald-100 text-emerald-800",
  expired: "bg-gray-100 text-gray-400",
  cancelled: "bg-gray-100 text-gray-500",
}

const OFFER_ORDER: Record<string, number> = {
  pending: 0,
  accepted: 1,
  declined: 2,
}

function expiresInHoursLabel(expiresAt: string, locale: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now()
  if (ms <= 0) return locale === "en" ? "Expired" : "Udløbet"
  const hours = Math.ceil(ms / (60 * 60 * 1000))
  if (hours <= 1) return locale === "en" ? "less than 1 hour" : "mindre end 1 time"
  if (hours === 1) return locale === "en" ? "1 hour" : "1 time"
  return locale === "en" ? `${hours} hours` : `${hours} timer`
}

function personsLabel(n: number, locale: string): string {
  if (locale === "en") return `${n} ${n === 1 ? "person" : "people"}`
  return `${n} person${n !== 1 ? "er" : ""}`
}

function arrivalPointLabel(point: string, tCabins: (key: string) => string): string {
  if (point === "airport") return tCabins("booking_transport_arrival_airport")
  if (point === "harbour") return tCabins("booking_transport_arrival_harbour")
  if (point === "helipad") return tCabins("booking_transport_arrival_helipad")
  return point
}

type Props = {
  request: TransportAnmodningRequestVM
  offers: TransportAnmodningOfferVM[]
}

export function TransportAnmodningClient({ request, offers }: Props) {
  const tCabins = useTranslations("cabins")
  const tDash = useTranslations("dashboard")
  const locale = useLocale()
  const localeDate = locale === "en" ? enGB : da
  const router = useRouter()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [transitionPending, startTransition] = useTransition()

  const requestIsOpen = request.status === "open"
  const arrivalLabel = arrivalPointLabel(request.arrival_point, tCabins)
  const arrivalDateFmt =
    request.arrival_date != null && request.arrival_date !== ""
      ? format(new Date(`${request.arrival_date}T12:00:00`), "d. MMM yyyy", {
          locale: localeDate,
        })
      : "—"

  const sortedOffers = useMemo(() => {
    return [...offers].sort((a, b) => {
      const oa = OFFER_ORDER[a.status] ?? 9
      const ob = OFFER_ORDER[b.status] ?? 9
      if (oa !== ob) return oa - ob
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [offers])

  function onAccept(offerId: string) {
    setPendingId(offerId)
    startTransition(async () => {
      const res = await acceptCabinTransportOffer(offerId)
      setPendingId(null)
      if ("error" in res) {
        toast.error(res.error)
        return
      }
      router.push(
        `/ophold/i-naturen/${res.cabinId}?transport_offer=${encodeURIComponent(res.offerId)}`,
      )
    })
  }

  const reqStatus = request.status ?? "open"

  function requestStatusLabel(status: string): string {
    switch (status) {
      case "open":
        return tDash("cabin_transport_req_open")
      case "accepted":
        return tDash("cabin_transport_req_accepted")
      case "expired":
        return tDash("cabin_transport_req_expired")
      case "cancelled":
        return tDash("cabin_transport_req_cancelled")
      default:
        return status
    }
  }

  function offerStatusLabel(status: string): string {
    switch (status) {
      case "pending":
        return tDash("stay_offers_status_pending")
      case "accepted":
        return tDash("stay_offers_status_accepted")
      case "declined":
        return tDash("stay_offers_status_declined")
      default:
        return status
    }
  }

  return (
    <div className="space-y-8">
      {request.status === "accepted" && (
        <p className="text-sm font-medium text-emerald-900 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
          {tDash("cabin_transport_confirmed_banner")}
        </p>
      )}

      <section className="rounded-2xl border border-border bg-white p-5 shadow-sm space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2 min-w-0">
            <Home className="w-5 h-5 text-[#114788] shrink-0" />
            <span className="truncate">{request.cabin_title}</span>
          </h2>
          <Badge
            className={`${REQUEST_STATUS_COLORS[reqStatus] ?? "bg-gray-100 text-gray-600"} border-0 shrink-0 text-xs`}
          >
            {requestStatusLabel(reqStatus)}
          </Badge>
        </div>

        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <Anchor className="w-4 h-4 shrink-0 text-[#114788]" />
            <span className="text-foreground font-medium">{arrivalLabel}</span>
          </span>
          <span className="flex items-center gap-2">
            <Calendar className="w-4 h-4 shrink-0" />
            {arrivalDateFmt}
          </span>
          <span className="flex items-center gap-2">
            <User className="w-4 h-4 shrink-0" />
            {personsLabel(request.num_persons, locale)}
          </span>
        </div>

        {requestIsOpen && (
          <p className="text-xs text-muted-foreground border-t border-border pt-3">
            {locale === "en" ? "Expires in " : "Udløber om "}
            <span className="font-semibold text-foreground">
              {expiresInHoursLabel(request.expires_at, locale)}
            </span>
          </p>
        )}

        {request.message != null && request.message.trim() !== "" && (
          <p className="text-sm text-foreground whitespace-pre-wrap border-t border-border pt-3">
            {request.message.trim()}
          </p>
        )}
      </section>

      {sortedOffers.length === 0 ? (
        <p className="text-sm text-muted-foreground bg-muted/40 rounded-xl p-5 border border-border">
          {tDash("cabin_transport_offers_empty")}
        </p>
      ) : (
        <ul className="space-y-4">
          {sortedOffers.map((off) => {
            const kr = oreToKr(off.price_ore)
            const nfLocale = locale === "en" ? "en-GB" : "da-DK"
            const krDisplay = kr.toLocaleString(nfLocale, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            })
            const isInactive = off.status !== "pending"
            const canAccept = requestIsOpen && off.status === "pending"
            const btnBusy = transitionPending && pendingId === off.id

            return (
              <li
                key={off.id}
                className={`rounded-2xl border p-4 sm:p-5 shadow-sm bg-white ${
                  isInactive ? "opacity-75 border-muted" : "border-border"
                }`}
              >
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground flex items-center gap-2">
                        <User className="w-4 h-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">
                          {off.provider_full_name?.trim() || tDash("stay_offers_unknown_host")}
                        </span>
                      </p>
                      <p className="text-lg font-bold tabular-nums text-foreground mt-1">
                        {krDisplay}{" "}
                        <span className="text-sm font-semibold text-muted-foreground">kr</span>
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={
                        off.status === "pending"
                          ? "bg-amber-100 text-amber-900 border-0"
                          : off.status === "accepted"
                            ? "bg-emerald-100 text-emerald-900 border-0"
                            : "border-0 bg-muted text-muted-foreground"
                      }
                    >
                      {offerStatusLabel(off.status)}
                    </Badge>
                  </div>

                  {off.message != null && off.message.trim() !== "" && (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap border-l-2 border-[#114788]/25 pl-3">
                      {off.message.trim()}
                    </p>
                  )}

                  {canAccept ? (
                    <div className="pt-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={btnBusy}
                        className="rounded-xl w-full sm:w-auto gap-1.5 bg-[#114788] hover:bg-[#0d3a6b] text-white"
                        onClick={() => onAccept(off.id)}
                      >
                        {btnBusy ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                            {tDash("cabin_transport_accept_busy")}
                          </>
                        ) : (
                          tDash("cabin_transport_accept_offer")
                        )}
                      </Button>
                    </div>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
