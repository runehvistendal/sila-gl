"use client"

import { useState, useEffect, useRef, useTransition } from "react"
import { useFormatter } from "next-intl"
import { Package, Check, Loader2, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { formatKr } from "@/lib/money"
import {
  submitTransportOffer,
  acceptTransportOffer,
} from "@/app/[locale]/transport/anmodninger/[id]/actions"
import { captureEvent } from "@/lib/analytics/posthog-events"

interface Offer {
  id: string
  skipper_id: string
  price_ore: number
  num_seats: number | null
  message: string | null
  status: string
  created_at: string
  profiles: { full_name: string | null } | null
}

interface Props {
  requestId: string
  requestStatus: string
  isRequester: boolean
  currentUserId: string
  initialOffers: Offer[]
}

const STATUS_LABELS: Record<string, string> = {
  pending:   "Afventer",
  accepted:  "Accepteret",
  rejected:  "Afvist",
  withdrawn: "Trukket tilbage",
}

export default function TransportRequestOffers({
  requestId,
  requestStatus,
  isRequester,
  currentUserId,
  initialOffers,
}: Props) {
  const [offers, setOffers] = useState<Offer[]>(initialOffers)
  const [showOffer, setShowOffer] = useState(false)
  const [offerPrice, setOfferPrice] = useState("")
  const [offerSeats, setOfferSeats] = useState(1)
  const [offerNote, setOfferNote] = useState("")
  const [offerError, setOfferError] = useState<string | null>(null)
  const [acceptError, setAcceptError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const fmt = useFormatter()

  const isClosed = requestStatus === "closed" || requestStatus === "cancelled"
  const isProvider = !isRequester

  const offerReceivedFired = useRef(false)
  useEffect(() => {
    if (!isRequester || offerReceivedFired.current) return
    const pending = offers.filter((o) => o.status === "pending")
    if (pending.length === 0) return
    offerReceivedFired.current = true
    captureEvent("transport_offer_received", { request_id: requestId })
  }, [isRequester, offers, requestId])

  function handleSubmitOffer(e: React.FormEvent) {
    e.preventDefault()
    setOfferError(null)
    const price = Number(offerPrice)
    if (!price || price < 1) {
      setOfferError("Angiv en pris i kr.")
      return
    }

    startTransition(async () => {
      const r = await submitTransportOffer({
        requestId,
        priceKr:  price,
        numSeats: offerSeats,
        note:     offerNote || undefined,
      })
      if ("error" in r) {
        setOfferError(r.error)
      } else {
        setShowOffer(false)
        setOfferPrice("")
        setOfferNote("")
        window.location.reload()
      }
    })
  }

  function handleAccept(offerId: string) {
    setAcceptError(null)
    const offerRow = offers.find((o) => o.id === offerId)
    startTransition(async () => {
      const r = await acceptTransportOffer(offerId)
      if ("error" in r) {
        setAcceptError(r.error)
      } else {
        captureEvent("transport_offer_accepted", {
          request_id: requestId,
          offer_id: offerId,
          price: offerRow ? Math.round(offerRow.price_ore / 100) : 0,
        })
        window.location.href = r.url
      }
    })
  }

  if (!isProvider && offers.length === 0) {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-border p-5 shadow-card">
        <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Package className="w-4 h-4 text-primary" />
          Tilbud
        </h2>

        {offers.length === 0 && isProvider && (
          <p className="text-sm text-muted-foreground">Ingen tilbud endnu.</p>
        )}

        <div className="space-y-3">
          {offers.map((offer) => {
            const isMyOffer = offer.skipper_id === currentUserId
            const offerIsPending = offer.status === "pending"
            const isAccepted = offer.status === "accepted"
            const skipperName = offer.profiles?.full_name ?? "Sejler"

            return (
              <div
                key={offer.id}
                className={`rounded-xl border p-4 ${
                  isAccepted
                    ? "border-green-300 bg-green-50"
                    : isMyOffer
                      ? "border-primary/30 bg-primary/5"
                      : "border-border bg-background"
                }`}
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="font-semibold text-sm text-foreground">{skipperName}</p>
                    <p className="text-xs text-muted-foreground">
                      {fmt.dateTime(new Date(offer.created_at), {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary text-lg">{formatKr(offer.price_ore)}</p>
                    {offer.num_seats ? (
                      <p className="text-xs text-muted-foreground">
                        {offer.num_seats} plads{offer.num_seats !== 1 ? "er" : ""}
                      </p>
                    ) : null}
                  </div>
                </div>

                {offer.message ? (
                  <p className="text-sm text-muted-foreground mt-2 italic">{offer.message}</p>
                ) : null}

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      isAccepted ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {STATUS_LABELS[offer.status] ?? offer.status}
                  </span>

                  {isRequester && offerIsPending && !isClosed && (
                    <Button
                      size="sm"
                      onClick={() => handleAccept(offer.id)}
                      disabled={isPending}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg gap-1.5 text-xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Accepter og betal
                      <ArrowRight className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {acceptError ? (
          <p className="text-sm text-destructive mt-3 bg-destructive/10 rounded-xl px-4 py-2">
            {acceptError}
          </p>
        ) : null}

        {isProvider && !isClosed && (
          <div className="mt-4 pt-4 border-t border-border">
            {!showOffer ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowOffer(true)}
                className="rounded-xl gap-2 border-primary/30 text-primary hover:bg-primary/5"
              >
                <Package className="w-4 h-4" />
                {offers.some((o) => o.skipper_id === currentUserId) ? "Opdater tilbud" : "Afgiv tilbud"}
              </Button>
            ) : (
              <form onSubmit={handleSubmitOffer} className="space-y-3">
                <p className="text-sm font-semibold text-foreground">
                  {offers.some((o) => o.skipper_id === currentUserId) ? "Opdater dit tilbud" : "Afgiv tilbud"}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs" htmlFor="offer-price">Pris (kr.)</Label>
                    <input
                      id="offer-price"
                      type="number"
                      min={1}
                      step={1}
                      value={offerPrice}
                      onChange={(e) => setOfferPrice(e.target.value)}
                      placeholder="f.eks. 800"
                      required
                      className="w-full h-9 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs" htmlFor="offer-seats">Pladser</Label>
                    <input
                      id="offer-seats"
                      type="number"
                      min={1}
                      max={50}
                      value={offerSeats}
                      onChange={(e) => setOfferSeats(Number(e.target.value))}
                      required
                      className="w-full h-9 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs" htmlFor="offer-note">Note (valgfri)</Label>
                  <input
                    id="offer-note"
                    type="text"
                    value={offerNote}
                    onChange={(e) => setOfferNote(e.target.value)}
                    placeholder="Afgangstid, mødested…"
                    maxLength={200}
                    className="w-full h-9 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                {offerError ? <p className="text-xs text-destructive">{offerError}</p> : null}
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isPending}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl gap-1.5"
                  >
                    {isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Package className="w-3.5 h-3.5" />
                    )}
                    Send tilbud
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowOffer(false)
                      setOfferError(null)
                    }}
                    className="rounded-xl text-muted-foreground"
                  >
                    Annuller
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
