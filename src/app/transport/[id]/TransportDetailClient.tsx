"use client"

import { useState, useTransition } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowRight, ChevronLeft, Calendar, Clock, Users, Anchor,
  RefreshCw, MessageSquare, User, Star,
} from "lucide-react"
import { formatNuukDate, formatNuukTime } from "@/lib/nuukTime"
import { GREENLAND_LOCATIONS } from "@/lib/greenlandLocations"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { formatKr, oreToKr } from "@/lib/money"
import { createTransportRequest } from "./actions"

const getLocationName = (id: string) =>
  GREENLAND_LOCATIONS.find((l) => l.name_dk.toLowerCase() === id.toLowerCase())?.name_dk ??
  id.charAt(0).toUpperCase() + id.slice(1)

const TransportMap = dynamic(() => import("@/components/map/TransportMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 bg-muted rounded-2xl flex items-center justify-center mb-6">
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        Indlæser kort...
      </div>
    </div>
  ),
})

const LOCATIONS = [...new Set(GREENLAND_LOCATIONS.map((l) => l.name_dk))].sort()

interface ReviewData {
  id: string
  rating: number
  comment: string | null
  created_at: string
  profiles: { full_name: string | null } | null
}

interface RideShareDetail {
  id: string
  sejler_id: string | null
  from_location: string
  from_latitude: number | null
  from_longitude: number | null
  to_location: string
  to_latitude: number | null
  to_longitude: number | null
  departure_at: string
  seats_available: number
  total_seats: number
  price_per_seat_ore: number
  boat_description: string | null
  description: string | null
  status: string
  profiles: { id: string; full_name: string | null; avatar_url: string | null } | null
}

interface Props {
  rideShare: RideShareDetail
  returnTrips: RideShareDetail[]
  alternativeReturnTrips: RideShareDetail[]
  reviews: ReviewData[]
  isLoggedIn: boolean
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`w-4 h-4 ${n <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-muted"}`}
        />
      ))}
    </div>
  )
}

export default function TransportDetailClient({ rideShare, returnTrips, alternativeReturnTrips, reviews, isLoggedIn }: Props) {
  const router = useRouter()

  const [seats,          setSeats]          = useState(1)
  const [message,        setMessage]        = useState("")
  const [ticketType,     setTicketType]     = useState<"single" | "return">("single")
  const [selectedReturn, setSelectedReturn] = useState<RideShareDetail | null>(null)
  const [showReqForm,    setShowReqForm]    = useState(false)
  const [reqSent,        setReqSent]        = useState(false)
  const [reqPending,     startReq]          = useTransition()

  const [reqForm, setReqForm] = useState({
    from_location:  rideShare.to_location,
    to_location:    rideShare.from_location,
    departure_date: "",
    num_guests:     1,
    notes:          "",
  })

  const priceOre      = rideShare.price_per_seat_ore
  const outboundTotal = seats * priceOre

  const [bookPending, setBookPending] = useState(false)

  async function handleBook() {
    if (bookPending) return
    setBookPending(true)
    try {
      const res = await fetch("/api/transport/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ride_share_id: rideShare.id, seats_booked: seats }),
      })
      const json = await res.json() as { url?: string; error?: string }
      if (!res.ok || !json.url) {
        toast.error(json.error ?? "Noget gik galt. Prøv igen.")
        return
      }
      router.push(json.url)
    } catch {
      toast.error("Forbindelsesfejl. Prøv igen.")
    } finally {
      setBookPending(false)
    }
  }

  async function handleBookBoth(returnPriceOre: number) {
    void returnPriceOre
    toast("Tur-retur betaling", { description: "Bestil de to ture separat." })
  }

  function handleSendRequest() {
    if (!reqForm.departure_date) return
    startReq(async () => {
      await createTransportRequest({
        from_location:  reqForm.from_location,
        to_location:    reqForm.to_location,
        departure_date: reqForm.departure_date,
        num_guests:     reqForm.num_guests,
        notes:          reqForm.notes || undefined,
      })
      setReqSent(true)
      setShowReqForm(false)
    })
  }

  function handleSwitchToReturn() {
    setTicketType("return")
  }

  function handleSwitchToSingle() {
    setTicketType("single")
    setSelectedReturn(null)
    setShowReqForm(false)
  }

  const avgRating = reviews.length > 0
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : null

  const depTime = formatNuukTime(rideShare.departure_at)

  return (
    <div className="min-h-screen pt-16 bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Back ── */}
        <button
          onClick={() => router.push("/transport")}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Tilbage til transport
        </button>

        {/* ── Route map ── */}
        {rideShare.from_latitude && rideShare.to_latitude ? (
          <TransportMap
            mode="detail"
            routes={[{
              id:       rideShare.id,
              fromName: getLocationName(rideShare.from_location),
              fromLat:  rideShare.from_latitude,
              fromLng:  rideShare.from_longitude ?? 0,
              toName:   getLocationName(rideShare.to_location),
              toLat:    rideShare.to_latitude,
              toLng:    rideShare.to_longitude ?? 0,
            }]}
            className="w-full h-64 md:h-80 mb-6"
          />
        ) : (
          <div className="w-full h-64 bg-muted rounded-2xl flex items-center justify-center mb-6">
            <Anchor className="w-16 h-16 text-muted-foreground/30" />
          </div>
        )}

        {/* ── Info card ── */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-6 sm:p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0">
              <Anchor className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xl font-bold text-foreground flex-wrap">
                <span>{getLocationName(rideShare.from_location)}</span>
                <ArrowRight className="w-5 h-5 text-primary shrink-0" />
                <span>{getLocationName(rideShare.to_location)}</span>
              </div>
              {rideShare.profiles && (
                <p className="text-sm text-muted-foreground break-words">
                  Sejler: {rideShare.profiles.full_name ?? "Sila-sejler"}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-muted rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <Calendar className="w-3.5 h-3.5" />Dato
              </div>
              <p className="font-semibold text-sm">
                {formatNuukDate(rideShare.departure_at)}
              </p>
            </div>
            {depTime && (
              <div className="bg-muted rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Clock className="w-3.5 h-3.5" />Afgang
                </div>
                <p className="font-semibold text-sm">{depTime}</p>
              </div>
            )}
            <div className="bg-muted rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <Users className="w-3.5 h-3.5" />Ledige pladser
              </div>
              <p className="font-semibold text-sm">{rideShare.seats_available}</p>
            </div>
            {rideShare.boat_description && (
              <div className="bg-muted rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Anchor className="w-3.5 h-3.5" />Båd
                </div>
                <p className="font-semibold text-sm truncate">{rideShare.boat_description}</p>
              </div>
            )}
          </div>

          {rideShare.description && (
            <div className="bg-muted rounded-xl p-4 text-sm text-muted-foreground leading-relaxed">
              {rideShare.description}
            </div>
          )}
        </div>

        {/* ── Booking card ── */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold text-foreground mb-5">Book din plads</h2>

          {/* Outbound info */}
          <div className="bg-primary/5 border border-primary/15 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-1">
              <ArrowRight className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm text-foreground">Afgang</span>
            </div>
            <p className="text-sm text-muted-foreground ml-6">
              {getLocationName(rideShare.from_location)} → {getLocationName(rideShare.to_location)} · {formatNuukDate(rideShare.departure_at)}
            </p>
            <p className="text-sm font-semibold text-primary ml-6 mt-1">
              {oreToKr(priceOre).toLocaleString("da-DK")} kr./plads
            </p>
          </div>

          {/* Seats */}
          <div className="mb-5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Antal pladser
            </label>
            <Input
              type="number"
              min={1}
              max={rideShare.seats_available}
              value={seats}
              onChange={(e) =>
                setSeats(Math.max(1, Math.min(rideShare.seats_available, Number(e.target.value))))
              }
              className="rounded-xl w-32"
            />
          </div>

          {/* ── Ticket type toggle ── */}
          <div className="flex gap-1 bg-muted rounded-xl p-1 mb-5">
            <button
              onClick={handleSwitchToSingle}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
                ticketType === "single"
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Enkeltbillet
            </button>
            <button
              onClick={handleSwitchToReturn}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                ticketType === "return"
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Returtur
              {returnTrips.length > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                  ticketType === "return"
                    ? "bg-primary/15 text-primary"
                    : "bg-muted-foreground/15 text-muted-foreground"
                }`}>
                  {returnTrips.length}
                </span>
              )}
            </button>
          </div>

          {/* ── Return mode panel ── */}
          <AnimatePresence>
            {ticketType === "return" && (
              <motion.div
                key="return-panel"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mb-5">
                  {/* Return trip cards */}
                  {returnTrips.length > 0 ? (
                    <div className="space-y-2 mb-3">
                      {returnTrips.map((rt) => {
                        const isSelected = selectedReturn?.id === rt.id
                        const rtPriceOre = rt.price_per_seat_ore
                        const combinedOre = seats * (priceOre + rtPriceOre)

                        return (
                          <div key={rt.id}>
                            {/* Card header — clickable */}
                            <button
                              onClick={() => setSelectedReturn(isSelected ? null : rt)}
                              className={`w-full text-left p-3 border transition-colors ${
                                isSelected
                                  ? "bg-accent/10 border-accent rounded-t-xl border-b-0"
                                  : "bg-muted border-border hover:border-accent/40 rounded-xl"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold">
                                    {getLocationName(rt.from_location)} → {getLocationName(rt.to_location)}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatNuukDate(rt.departure_at)} · {rt.seats_available} pladser
                                  </p>
                                  {rt.profiles && (
                                    <p className="text-xs text-primary font-medium mt-0.5">
                                      Sejler: {rt.profiles.full_name ?? "Sila-sejler"}
                                    </p>
                                  )}
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-sm font-bold text-primary">
                                    {formatKr(rtPriceOre)}/plads
                                  </p>
                                  {isSelected && (
                                    <Badge className="bg-accent/20 text-accent border-0 text-xs mt-1">
                                      Valgt
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </button>

                            {/* Inline expand — price summary + "Book begge" */}
                            <AnimatePresence>
                              {isSelected && (
                                <motion.div
                                  key={`expand-${rt.id}`}
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="overflow-hidden"
                                >
                                  <div className="bg-accent/5 border border-accent border-t-0 rounded-b-xl p-4 space-y-3">
                                    {/* Price breakdown */}
                                    <div className="text-sm space-y-1.5">
                                      <div className="flex justify-between text-muted-foreground">
                                        <span>
                                          Udrejse: {oreToKr(priceOre).toLocaleString("da-DK")} kr. × {seats} plads{seats !== 1 ? "er" : ""}
                                        </span>
                                        <span>{formatKr(seats * priceOre)}</span>
                                      </div>
                                      <div className="flex justify-between text-muted-foreground">
                                        <span>
                                          Returrejse: {oreToKr(rtPriceOre).toLocaleString("da-DK")} kr. × {seats} plads{seats !== 1 ? "er" : ""}
                                        </span>
                                        <span>{formatKr(seats * rtPriceOre)}</span>
                                      </div>
                                      <div className="flex justify-between font-bold text-foreground pt-1.5 border-t border-border">
                                        <span>Total</span>
                                        <span>{formatKr(combinedOre)}</span>
                                      </div>
                                    </div>

                                    {/* Book begge button */}
                                    {rideShare.seats_available === 0 ? (
                                      <Button disabled className="w-full h-11 rounded-xl font-semibold">
                                        Fuldt booket (udrejse)
                                      </Button>
                                    ) : !isLoggedIn ? (
                                      <Button
                                        onClick={() => router.push("/login")}
                                        className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-semibold"
                                      >
                                        Log ind for at booke begge
                                      </Button>
                                    ) : (
                                      <Button
                                        onClick={() => handleBookBoth(rtPriceOre)}
                                        className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-semibold"
                                      >
                                        Book begge — {formatKr(combinedOre)}
                                      </Button>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="bg-muted rounded-xl p-4 text-sm text-muted-foreground text-center mb-3">
                      Ingen returture fra samme sejler
                    </div>
                  )}

                  {/* Request return CTA */}
                  {!reqSent && (
                    <button
                      onClick={() => setShowReqForm(!showReqForm)}
                      className={`w-full text-left p-3 rounded-xl border transition-colors ${
                        showReqForm
                          ? "bg-primary/5 border-primary/30"
                          : "bg-muted border-border hover:border-primary/40"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">Anmod om returtur</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 ml-6">
                        Send en anmodning til alle sejlere
                      </p>
                    </button>
                  )}

                  {/* Inline request form */}
                  <AnimatePresence>
                    {showReqForm && !reqSent && (
                      <motion.div
                        key="req-form"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 pt-4 border-t border-border space-y-3">
                          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                            <span className="text-amber-500 mt-0.5 text-base leading-none">⚠️</span>
                            <p className="text-xs text-amber-800">
                              <strong>Bemærk:</strong> Dette er en anmodning — ikke en bekræftet booking. Sejlere kontakter dig.
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Fra</label>
                              <select
                                value={reqForm.from_location}
                                onChange={(e) => setReqForm((p) => ({ ...p, from_location: e.target.value }))}
                                className="w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                              >
                                {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Til</label>
                              <select
                                value={reqForm.to_location}
                                onChange={(e) => setReqForm((p) => ({ ...p, to_location: e.target.value }))}
                                className="w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                              >
                                {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Ønsket dato</label>
                              <Input
                                type="date"
                                value={reqForm.departure_date}
                                onChange={(e) => setReqForm((p) => ({ ...p, departure_date: e.target.value }))}
                                min={new Date().toISOString().split("T")[0]}
                              />
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Passagerer</label>
                              <Input
                                type="number"
                                min={1}
                                max={20}
                                value={reqForm.num_guests}
                                onChange={(e) => setReqForm((p) => ({ ...p, num_guests: Number(e.target.value) }))}
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Besked (valgfrit)</label>
                            <Textarea
                              value={reqForm.notes}
                              onChange={(e) => setReqForm((p) => ({ ...p, notes: e.target.value }))}
                              rows={2}
                              placeholder="Fortæl om din tur..."
                              className="resize-none"
                            />
                          </div>

                          <Button
                            onClick={handleSendRequest}
                            disabled={!reqForm.departure_date || reqPending}
                            className="w-full bg-primary text-primary-foreground rounded-xl h-11 font-semibold"
                          >
                            {reqPending ? "Sender..." : "Send anmodning"}
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Request sent success */}
                  {reqSent && (
                    <div className="mt-3 flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
                      <span className="text-green-500 text-lg leading-none">✓</span>
                      <div>
                        <p className="text-sm font-semibold text-green-800">Anmodning sendt!</p>
                        <p className="text-xs text-green-700 mt-0.5">Sejlere på ruten vil kontakte dig.</p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Enkeltbillet mode: message + price + CTA ── */}
          <AnimatePresence>
            {ticketType === "single" && (
              <motion.div
                key="single-panel"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div>
                  {/* Message to skipper */}
                  <div className="mb-5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                      Besked til sejler (valgfri)
                    </label>
                    <Textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Spørgsmål til sejleren..."
                      rows={2}
                      className="rounded-xl resize-none"
                    />
                  </div>

                  {/* Price summary */}
                  <div className="bg-muted rounded-xl p-4 mb-5 text-sm space-y-1.5">
                    <div className="flex justify-between text-muted-foreground">
                      <span>
                        {oreToKr(priceOre).toLocaleString("da-DK")} kr. × {seats} plads{seats !== 1 ? "er" : ""}
                      </span>
                      <span>{formatKr(outboundTotal)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-foreground pt-1 border-t border-border">
                      <span>Total</span>
                      <span>{formatKr(outboundTotal)}</span>
                    </div>
                  </div>

                  {/* Book button */}
                  {rideShare.seats_available === 0 ? (
                    <Button disabled className="w-full h-12 rounded-xl font-semibold">
                      Fuldt booket
                    </Button>
                  ) : !isLoggedIn ? (
                    <Button
                      onClick={() => router.push("/login")}
                      className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-semibold"
                    >
                      Log ind for at booke
                    </Button>
                  ) : (
                    <Button
                      onClick={handleBook}
                      disabled={bookPending}
                      className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-semibold"
                    >
                      {bookPending ? "Åbner betaling…" : `Gå til betaling — ${formatKr(outboundTotal)}`}
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-xs text-muted-foreground text-center mt-4">
            Sikker betaling via Stripe
          </p>
        </div>

        {/* ── Alternative returture fra andre sejlere ── */}
        {ticketType === "return" && returnTrips.length === 0 && (
          <div className="bg-white rounded-2xl border border-border shadow-sm p-6 mb-6">
            <h2 className="text-base font-bold text-foreground mb-3">
              Andre sejlture fra {getLocationName(rideShare.to_location)}
            </h2>
            {alternativeReturnTrips.length > 0 ? (
              <div className="space-y-2">
                {alternativeReturnTrips.map((alt) => (
                  <Link
                    key={alt.id}
                    href={`/transport/${alt.id}`}
                    className="flex items-center justify-between p-3 bg-muted border border-border hover:border-primary/40 rounded-xl transition-colors group"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        {getLocationName(alt.from_location)} → {getLocationName(alt.to_location)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatNuukDate(alt.departure_at)}
                        {formatNuukTime(alt.departure_at) ? ` kl. ${formatNuukTime(alt.departure_at)}` : ""}
                        {" · "}{alt.seats_available} plads{alt.seats_available !== 1 ? "er" : ""}
                      </p>
                      {alt.profiles && (
                        <p className="text-xs text-primary font-medium mt-0.5">
                          Sejler: {alt.profiles.full_name ?? "Sila-sejler"}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-sm font-bold text-primary">{formatKr(alt.price_per_seat_ore)}</p>
                      <p className="text-xs text-muted-foreground">pr. plads</p>
                      <span className="text-xs text-primary group-hover:text-primary/80">Se tur →</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground bg-muted rounded-xl p-4 text-center">
                Ingen tilgængelige sejlture fra {getLocationName(rideShare.to_location)} endnu.
              </p>
            )}
          </div>
        )}

        {/* ── Om sejleren ── */}
        {rideShare.profiles && (
          <div className="bg-white rounded-2xl border border-border shadow-sm p-6 mb-6">
            <h2 className="text-base font-bold text-foreground mb-3">Om sejleren</h2>
            <button
              onClick={() => router.push("/profil")}
              className="flex items-center gap-4 p-4 bg-muted/40 rounded-2xl hover:bg-muted transition-colors w-full text-left min-w-0 overflow-hidden"
            >
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                {rideShare.profiles.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={rideShare.profiles.avatar_url}
                    alt={rideShare.profiles.full_name ?? "Sila-sejler"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-6 h-6 text-primary" />
                )}
              </div>
              <div className="min-w-0 overflow-hidden">
                <p className="font-semibold text-foreground break-words">
                  {rideShare.profiles.full_name ?? "Sila-sejler"}
                </p>
                <p className="text-sm text-primary">Se profil →</p>
              </div>
            </button>
          </div>
        )}

        {/* ── Anmeldelser ── */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
          <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            Anmeldelser
            {avgRating && (
              <span className="font-bold text-foreground">
                {avgRating.toFixed(1)} ★ ({reviews.length} anmeldelse{reviews.length !== 1 ? "r" : ""})
              </span>
            )}
          </h2>

          {reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground bg-muted rounded-xl p-4 text-center">
              Ingen anmeldelser endnu
            </p>
          ) : (
            <div className="space-y-4">
              {reviews.map((r) => (
                <div key={r.id} className="bg-white rounded-xl border border-border p-4">
                  <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                    <p className="text-sm font-semibold text-foreground">
                      {r.profiles?.full_name ?? "Anonym"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <StarRow rating={r.rating} />
                  {r.comment && (
                    <p className="text-sm italic text-muted-foreground mt-2 leading-relaxed">
                      {r.comment}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
