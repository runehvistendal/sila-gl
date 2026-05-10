"use client"

import { useMemo, useState, useTransition } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Link } from "@/i18n/navigation"
import { acceptStayOffer, declineStayOffer } from "@/app/actions/stay-offers"
import { publishedCabinDetailPath } from "@/lib/cabinPublicPaths"
import { calcServiceFee, formatKr } from "@/lib/money"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ExternalLink, MapPin, Calendar, Users, Loader2, Anchor } from "lucide-react"
import { format } from "date-fns"
import { da, enGB } from "date-fns/locale"
import { toast } from "sonner"
import { formatStayRequestLocationDisplay } from "@/lib/greenlandLocations"

type StayRequestSummary = {
  id: string
  location: string
  desired_check_in: string
  desired_check_out: string
  num_guests: number
  max_price_ore: number | null
  description: string | null
  property_type: string
  needs_transport: boolean
  status: string
}

export type StayOfferRow = {
  id: string
  offered_price_ore: number
  transport_price_ore: number
  message: string | null
  status: string
  created_at: string
  decline_reason: string | null
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
  pending:  0,
  accepted: 1,
  expired:  2,
  declined: 3,
  rejected: 4,
}

export function StayOffersClient({ stayRequest, offers }: Props) {
  const t = useTranslations("dashboard")
  const tReq = useTranslations("request")
  const locale = useLocale()
  const localeDate = locale === "en" ? enGB : da
  const router = useRouter()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [declineDialogOfferId, setDeclineDialogOfferId] = useState<string | null>(null)
  const [declineComment, setDeclineComment] = useState("")
  const [transitionPending, startTransition] = useTransition()

  const requestIsOpen = stayRequest.status === "open"

  const propertyBadge =
    stayRequest.property_type === "residence"
      ? tReq("badge_residence")
      : stayRequest.property_type === "any"
        ? tReq("badge_any")
        : tReq("badge_cabin")

  function statusLabel(s: string): string {
    switch (s) {
      case "pending":
        return t("stay_offers_status_pending")
      case "accepted":
        return t("stay_offers_status_accepted")
      case "rejected":
        return t("stay_offers_status_rejected")
      case "declined":
        return t("stay_offers_status_declined")
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

  function openDeclineDialog(offerId: string) {
    setDeclineComment("")
    setDeclineDialogOfferId(offerId)
  }

  function confirmDecline() {
    if (!declineDialogOfferId) return
    const id = declineDialogOfferId
    const comment = declineComment.trim().slice(0, 300)
    setPendingId(id)
    startTransition(async () => {
      const res = await declineStayOffer(id, comment.length > 0 ? comment : null)
      setPendingId(null)
      if ("error" in res) {
        toast.error(res.error)
        return
      }
      setDeclineDialogOfferId(null)
      setDeclineComment("")
      toast.success(t("stay_offers_decline_toast_success"))
      router.refresh()
    })
  }

  const declineDialogBusy = transitionPending && declineDialogOfferId != null && pendingId === declineDialogOfferId

  return (
    <div className="space-y-8">
      <Dialog
        open={declineDialogOfferId != null}
        onOpenChange={(open) => {
          if (!open) {
            setDeclineDialogOfferId(null)
            setDeclineComment("")
          }
        }}
      >
        <DialogContent className="flex flex-col gap-0 p-6 sm:max-w-md rounded-2xl">
          <div className="space-y-4 pr-6">
            <DialogHeader className="space-y-0 text-left">
              <DialogTitle className="text-lg font-semibold mb-1">
                {t("stay_offers_decline_dialog_title")}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mb-4">
                {t("stay_offers_decline_dialog_hint")}
              </DialogDescription>
            </DialogHeader>
            <div>
              <label
                htmlFor="stay-decline-comment"
                className="text-sm font-medium text-foreground mb-2 block"
              >
                {t("stay_offers_decline_comment_label")}
              </label>
              <Textarea
                id="stay-decline-comment"
                value={declineComment}
                onChange={(e) => setDeclineComment(e.target.value.slice(0, 300))}
                placeholder={t("stay_offers_decline_comment_placeholder")}
                maxLength={300}
                className="min-h-[100px] rounded-lg border border-input bg-background p-3 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#114788] focus-visible:ring-offset-2"
              />
              <p className="text-xs text-muted-foreground text-right mt-1.5 tabular-nums">
                {declineComment.length}/300
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full pt-1">
              <Button
                type="button"
                className="w-full rounded-xl gap-1.5 bg-red-600 text-white hover:bg-red-700"
                onClick={confirmDecline}
                disabled={declineDialogBusy}
              >
                {declineDialogBusy ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                    {t("stay_offers_decline_submitting")}
                  </>
                ) : (
                  t("stay_offers_decline_confirm")
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-xl"
                onClick={() => setDeclineDialogOfferId(null)}
                disabled={declineDialogBusy}
              >
                {t("stay_offers_decline_cancel")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <section className="rounded-2xl border border-border bg-white p-5 shadow-sm space-y-3">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="capitalize">{formatStayRequestLocationDisplay(stayRequest.location)}</span>
        </h2>
        <span className="inline-flex rounded-md border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-foreground">
          {propertyBadge}
        </span>
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
        {stayRequest.description?.trim() ? (
          <p className="text-sm text-foreground whitespace-pre-wrap border-t border-border pt-3">
            {stayRequest.description.trim()}
          </p>
        ) : null}
        {stayRequest.max_price_ore != null && stayRequest.max_price_ore > 0 && (
          <p className="text-sm text-foreground">
            {t("stay_offer_budget_upto", { amount: formatKr(stayRequest.max_price_ore) })}
          </p>
        )}
        {stayRequest.needs_transport ? (
          <p className="text-xs font-semibold inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-2.5 py-1 border border-primary/15 w-fit">
            <Anchor className="w-3.5 h-3.5 shrink-0" aria-hidden />
            {t("stay_offer_needs_transport_badge")}
          </p>
        ) : null}
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
            const isDeclined = off.status === "declined"
            const inactiveOffer = isRejected || isDeclined || off.status === "expired"
            const offerPending = off.status === "pending"
            const canAct = offerPending && requestIsOpen
            const btnBusy = transitionPending && pendingId === off.id

            const transportOre = Math.max(0, off.transport_price_ore ?? 0)
            const stayOre = off.offered_price_ore
            const subtotalOre = stayOre + transportOre
            const serviceFeeOre = calcServiceFee(subtotalOre)
            const totalOre = subtotalOre + serviceFeeOre

            return (
              <li
                key={off.id}
                className={`rounded-2xl border p-4 sm:p-5 shadow-sm bg-white ${
                  inactiveOffer ? "opacity-60 border-muted" : "border-border"
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
                    <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 space-y-1 text-sm">
                      <p className="flex justify-between gap-2">
                        <span className="text-muted-foreground">{t("stay_offers_price_stay")}</span>
                        <span className="font-medium tabular-nums">{formatKr(stayOre)}</span>
                      </p>
                      {transportOre > 0 ? (
                        <p className="flex justify-between gap-2">
                          <span className="text-muted-foreground">{t("stay_offers_price_transport")}</span>
                          <span className="font-medium tabular-nums">{formatKr(transportOre)}</span>
                        </p>
                      ) : null}
                      {serviceFeeOre > 0 ? (
                        <p className="flex justify-between gap-2">
                          <span className="text-muted-foreground">{t("stay_offers_price_service")}</span>
                          <span className="font-medium tabular-nums">{formatKr(serviceFeeOre)}</span>
                        </p>
                      ) : null}
                      <p className="flex justify-between gap-2 pt-1 border-t border-border font-semibold text-foreground">
                        <span>{t("stay_offers_price_total")}</span>
                        <span className="tabular-nums">{formatKr(totalOre)}</span>
                      </p>
                      <p className="text-xs text-muted-foreground pt-1">{t("stay_offers_price_includes_service")}</p>
                    </div>
                    {off.message ? (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap border-l-2 border-muted pl-3">
                        {off.message}
                      </p>
                    ) : null}
                    {isDeclined && off.decline_reason?.trim() ? (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap border-l-2 border-muted pl-3">
                        <span className="block font-medium text-foreground mb-1">
                          {t("stay_offers_decline_your_comment")}
                        </span>
                        {off.decline_reason.trim()}
                      </p>
                    ) : null}
                    <div className="flex flex-col sm:flex-row flex-wrap gap-2 pt-2">
                      {c ? (
                        inactiveOffer ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-xl w-full sm:w-auto gap-1.5 pointer-events-none opacity-60"
                            disabled
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            {t("stay_offers_se_opslag")}
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" className="rounded-xl w-full sm:w-auto gap-1.5" asChild>
                            <Link href={listingHref} target="_blank" rel="noreferrer">
                              <ExternalLink className="w-3.5 h-3.5" />
                              {t("stay_offers_se_opslag")}
                            </Link>
                          </Button>
                        )
                      ) : null}
                      {canAct ? (
                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:flex-initial">
                          <Button
                            size="sm"
                            disabled={btnBusy}
                            className="rounded-xl flex-1 sm:flex-initial gap-1.5 bg-[#114788] hover:bg-[#0d3a6b] text-white"
                            onClick={() => onAccept(off.id)}
                          >
                            {btnBusy && pendingId === off.id && declineDialogOfferId == null ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                {t("stay_offers_accepting")}
                              </>
                            ) : (
                              t("stay_offers_accept")
                            )}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={btnBusy}
                            className="rounded-xl flex-1 sm:flex-initial border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => openDeclineDialog(off.id)}
                          >
                            {t("stay_offers_decline")}
                          </Button>
                        </div>
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
