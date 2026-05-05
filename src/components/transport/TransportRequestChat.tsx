"use client"

import { useState, useEffect, useRef, useTransition } from "react"
import { format } from "date-fns"
import { da } from "date-fns/locale"
import { Send, Package, Check, Loader2, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase"
import { formatKr, krToOre } from "@/lib/money"
import {
  sendTransportMessage,
  submitTransportOffer,
  acceptTransportOffer,
} from "@/app/[locale]/transport/anmodninger/[id]/actions"

interface Message {
  id: string
  sender_id: string
  content: string
  created_at: string
  profiles: { full_name: string | null } | null
}

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
  requestId:       string
  requestStatus:   string
  isRequester:     boolean
  currentUserId:   string
  initialMessages: Message[]
  initialOffers:   Offer[]
  canChat:         boolean
}

const STATUS_LABELS: Record<string, string> = {
  pending:   "Afventer",
  accepted:  "Accepteret",
  rejected:  "Afvist",
  withdrawn: "Trukket tilbage",
}

export default function TransportRequestChat({
  requestId,
  requestStatus,
  isRequester,
  currentUserId,
  initialMessages,
  initialOffers,
  canChat,
}: Props) {
  const [messages,     setMessages]     = useState<Message[]>(initialMessages)
  const [offers,       setOffers]       = useState<Offer[]>(initialOffers)
  const [msgText,      setMsgText]      = useState("")
  const [sendError,    setSendError]    = useState<string | null>(null)
  const [showOffer,    setShowOffer]    = useState(false)
  const [offerPrice,   setOfferPrice]   = useState("")
  const [offerSeats,   setOfferSeats]   = useState(1)
  const [offerNote,    setOfferNote]    = useState("")
  const [offerError,   setOfferError]   = useState<string | null>(null)
  const [acceptError,  setAcceptError]  = useState<string | null>(null)
  const [isPending,    startTransition] = useTransition()
  const bottomRef = useRef<HTMLDivElement>(null)

  const isClosed = requestStatus === "closed" || requestStatus === "cancelled"
  const isProvider = !isRequester

  // Supabase Realtime — subscribe to new messages for this request
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`transport-chat-${requestId}`)
      .on(
        "postgres_changes",
        {
          event:  "INSERT",
          schema: "public",
          table:  "messages",
          filter: `transport_request_id=eq.${requestId}`,
        },
        (payload) => {
          const row = payload.new as Message & { profiles?: null }
          // Avoid duplicate if we added it optimistically
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev
            return [...prev, { ...row, profiles: null }]
          })
        },
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [requestId])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!msgText.trim() || isPending) return
    const text = msgText.trim()
    setSendError(null)
    setMsgText("")

    // Optimistic insert
    const optimistic: Message = {
      id:         `tmp-${Date.now()}`,
      sender_id:  currentUserId,
      content:    text,
      created_at: new Date().toISOString(),
      profiles:   null,
    }
    setMessages((prev) => [...prev, optimistic])

    startTransition(async () => {
      const r = await sendTransportMessage(requestId, text)
      if ("error" in r) {
        setSendError(r.error)
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
        setMsgText(text)
      }
    })
  }

  function handleSubmitOffer(e: React.FormEvent) {
    e.preventDefault()
    setOfferError(null)
    const price = Number(offerPrice)
    if (!price || price < 1) { setOfferError("Angiv en pris i kr."); return }

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
        // Re-fetch offers by nudging state (server revalidates)
        window.location.reload()
      }
    })
  }

  function handleAccept(offerId: string) {
    setAcceptError(null)
    startTransition(async () => {
      const r = await acceptTransportOffer(offerId)
      if ("error" in r) {
        setAcceptError(r.error)
      } else {
        window.location.href = r.url
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* ── Offers section ── */}
      {(offers.length > 0 || isProvider) && (
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
              const isPending = offer.status === "pending"
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
                        {format(new Date(offer.created_at), "d. MMM, HH:mm", { locale: da })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary text-lg">{formatKr(offer.price_ore)}</p>
                      {offer.num_seats && (
                        <p className="text-xs text-muted-foreground">{offer.num_seats} plads{offer.num_seats !== 1 ? "er" : ""}</p>
                      )}
                    </div>
                  </div>

                  {offer.message && (
                    <p className="text-sm text-muted-foreground mt-2 italic">{offer.message}</p>
                  )}

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      isAccepted ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
                    }`}>
                      {STATUS_LABELS[offer.status] ?? offer.status}
                    </span>

                    {isRequester && isPending && !isClosed && (
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

          {acceptError && (
            <p className="text-sm text-destructive mt-3 bg-destructive/10 rounded-xl px-4 py-2">
              {acceptError}
            </p>
          )}

          {/* Submit offer form — providers only, request open */}
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
                  {offerError && (
                    <p className="text-xs text-destructive">{offerError}</p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      size="sm"
                      disabled={isPending}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl gap-1.5"
                    >
                      {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Package className="w-3.5 h-3.5" />}
                      Send tilbud
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => { setShowOffer(false); setOfferError(null) }}
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
      )}

      {/* ── Chat ── */}
      {canChat ? (
        <div className="bg-white rounded-2xl border border-border shadow-card flex flex-col" style={{ minHeight: 340 }}>
          <div className="px-5 py-3 border-b border-border">
            <h2 className="font-semibold text-foreground text-sm">Chat</h2>
          </div>

          {/* Message list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: 400 }}>
            {messages.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                Ingen beskeder endnu. Start samtalen.
              </p>
            ) : (
              messages.map((m) => {
                const isMine = m.sender_id === currentUserId
                const senderName = m.profiles?.full_name ?? (isMine ? "Dig" : "Sejler")
                return (
                  <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                        isMine
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted text-foreground rounded-bl-sm"
                      }`}
                    >
                      {!isMine && (
                        <p className="text-[11px] font-semibold mb-0.5 opacity-70">{senderName}</p>
                      )}
                      <p className="leading-snug whitespace-pre-wrap break-words">{m.content}</p>
                      <p className={`text-[10px] mt-1 opacity-60 ${isMine ? "text-right" : ""}`}>
                        {format(new Date(m.created_at), "HH:mm", { locale: da })}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          {!isClosed && (
            <form onSubmit={handleSend} className="p-3 border-t border-border flex gap-2">
              <Textarea
                value={msgText}
                onChange={(e) => setMsgText(e.target.value)}
                placeholder="Skriv en besked…"
                rows={1}
                className="flex-1 rounded-xl resize-none min-h-[40px] max-h-[120px] text-sm py-2"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSend(e as unknown as React.FormEvent)
                  }
                }}
              />
              <Button
                type="submit"
                size="icon"
                disabled={isPending || !msgText.trim()}
                className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl w-10 h-10"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </form>
          )}

          {sendError && (
            <p className="text-xs text-destructive px-4 pb-3">{sendError}</p>
          )}
        </div>
      ) : (
        /* Not yet a participant — show offer CTA for providers */
        isProvider ? (
          <div className="bg-white rounded-2xl border border-dashed border-border p-8 text-center">
            <Package className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-medium text-foreground mb-1">Afgiv et tilbud for at chatte</p>
            <p className="text-sm text-muted-foreground mb-4">
              Når du sender et tilbud, åbnes chatten med anmoderen.
            </p>
            <Button
              onClick={() => setShowOffer(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl gap-2"
            >
              <Package className="w-4 h-4" /> Afgiv tilbud
            </Button>
          </div>
        ) : null
      )}
    </div>
  )
}
