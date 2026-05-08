"use client"

import { useMemo, useState, useTransition } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { acceptStayOffer } from "@/app/actions/stay-offers"
import { publishedCabinDetailPath } from "@/lib/cabinPublicPaths"
import { formatKr } from "@/lib/money"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, MapPin, Calendar, Users, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { da, enGB } from "date-fns/locale"
import { toast } from "sonner"

type StayRequestSummary = {
  id: string
  location: string
  desired_check_in: string
  desired_check_out: string
  num_guests: number
  max_price_ore: number | null
  status: string
}

export type StayOfferRow = {
  id: string
  offered_price_ore: number
  message: string | null
  status: string
  created_at: string
  cabins: {
    id: string
    title: string
    images: string[] | null
    price_per_night_ore: number
    location_hub: string
    property_type: string | null
  } | null
  profiles: {
    id: string
    full_name: string | null
    avatar_url: string | null
  } | null
}

type Props = {
  stayRequest: StayRequestSummary
  offers: StayOfferRow[]
}

const STATUS_ORDER: Record<string, number> = {
  pending: 0,
  accepted: 1,
  expired: 2,
  rejected: 3,
}

export function StayOffersClient({ stayRequest, offers }: Props) {
  const t = useTranslations("dashboard")
  const locale = useLocale()
  const localeDate = locale === "en" ? enGB : da
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [transitionPending, startTransition] = useTransition()

  const requestIsOpen = stayRequest.status === "open"

  function statusLabel(s: string): string {
    switch (s) {
      case "pending":
        return t("stay_offers_status_pending")
      case "accepted":
        return t("stay_offers_status_accepted")
      case "rejected":
        return t("stay_offers_status_rejected")
      case "expired":
        return t("stay_offers_status_expired")
      default:
        return s
    }
  }

  const sorted = useMemo(() => {
    return [...offers].sort((a, b) => {
      const daO = STATUS_ORDER[a.status] ?? 5
      const dbO = STATUS_ORDER[b.status] ?? 5
      if (daO !== dbO) return daO - dbO
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [offers])

  function onAccept(offerId: string) {
    setPendingId(offerId)
    startTransition(async () => {
      const res = await acceptStayOffer(offerId)
      setPendingId(null)
      if ("error" in res) {
        toast.error(res.error)
        return
      }
      if (typeof window !== "undefined") {
        window.location.assign(res.checkoutUrl)
      }
    })
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-border bg-white p-5 shadow-sm space-y-3">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          <span className="capitalize">{stayRequest.location}</span>
        </h2>
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <Calendar className="w-4 h-4 shrink-0" />
            {format(new Date(stayRequest.desired_check_in), "d. MMM yyyy", { locale: localeDate })}
            {" — "}
            {format(new Date(stayRequest.desired_check_out), "d. MMM yyyy", { locale: localeDate })}
          </span>
          <span className="flex items-center gap-2">
            <Users className="w-4 h-4 shrink-0" />
            {t("stay_offers_guest_line", { count: stayRequest.num_guests })}
          </span>
        </div>
        {stayRequest.max_price_ore != null && stayRequest.max_price_ore > 0 && (
          <p className="text-xs text-muted-foreground">
            {t("stay_offer_max_budget", { amount: formatKr(stayRequest.max_price_ore) })}
          </p>
        )}
      </section>

      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground bg-muted/40 rounded-xl p-5 border border-border">
          {t("stay_offers_empty_state")}
        </p>
      ) : (
        <ul className="space-y-4">
          {sorted.map((off) => {
            const c = off.cabins
            const p = off.profiles
            const img = c?.images?.[0]
            const listingHref = c ? publishedCabinDetailPath(c.property_type, c.id) : "#"
            const isRejected = off.status === "rejected"
            const offerPending = off.status === "pending"
            const canPay = offerPending && requestIsOpen
            const btnBusy = transitionPending && pendingId === off.id

            return (
              <li
                key={off.id}
                className={`rounded-2xl border p-4 sm:p-5 shadow-sm bg-white ${
                  isRejected ? "opacity-60 border-muted" : "border-border"
                }`}
              >
                <div className="flex gap-3 sm:gap-4">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-xl overflow-hidden bg-muted">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                        —
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-foreground leading-tight">
                          {c?.title ?? "—"}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="w-7 h-7 rounded-full bg-primary/10 overflow-hidden shrink-0 flex items-center justify-center">
                            {p?.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={p.avatar_url}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-[10px] font-bold text-[#114788]">
                                {(p?.full_name ?? "?").slice(0, 1)}
                              </span>
                            )}
                          </div>
                          <span className="text-sm text-muted-foreground truncate">
                            {p?.full_name ?? t("stay_offers_unknown_host")}
                          </span>
                        </div>
                      </div>
                      <Badge
                        variant="secondary"
                        className={
                          off.status === "pending"
                            ? "bg-amber-100 text-amber-900 border-0"
                            : off.status === "accepted"
                              ? "bg-emerald-100 text-emerald-900 border-0"
                              : "border-0"
                        }
                      >
                        {statusLabel(off.status)}
                      </Badge>
                    </div>
                    <p className="text-base font-bold text-foreground">
                      {formatKr(off.offered_price_ore)}
                    </p>
                    {off.message ? (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap border-l-2 border-muted pl-3">
                        {off.message}
                      </p>
                    ) : null}
                    <div className="flex flex-col sm:flex-row gap-2 pt-2">
                      {c ? (
                        <Button variant="outline" size="sm" className="rounded-xl w-full sm:w-auto gap-1.5" asChild>
                          <Link href={listingHref} target="_blank" rel="noreferrer">
                            <ExternalLink className="w-3.5 h-3.5" />
                            {t("stay_offers_se_opslag")}
                          </Link>
                        </Button>
                      ) : null}
                      {canPay ? (
                        <Button
                          size="sm"
                          disabled={btnBusy}
                          className="rounded-xl w-full sm:w-auto gap-1.5 bg-[#114788] hover:bg-[#0d3a6b] text-white"
                          onClick={() => onAccept(off.id)}
                        >
                          {btnBusy ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              {t("stay_offers_accepting")}
                            </>
                          ) : (
                            t("stay_offers_accept")
                          )}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
