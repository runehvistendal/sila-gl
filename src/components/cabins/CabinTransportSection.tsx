"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Anchor, MessageSquare, X, Check, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase"
import { formatKr, oreToKr } from "@/lib/money"
import { GREENLAND_LOCATIONS } from "@/lib/greenlandLocations"
import { format } from "date-fns"

const LOCATIONS = [...new Set(GREENLAND_LOCATIONS.map((l) => l.name_dk))].sort()

export interface RideShareData {
  id: string
  from_location: string
  to_location: string
  departure_at: string
  seats_available: number
  total_seats: number
  price_per_seat_ore: number
  profiles: { full_name: string | null } | null
}

interface Props {
  cabin: {
    id: string
    location_hub: string
    offers_transport: boolean
    transport_price_per_person_ore: number | null
    profiles: { full_name: string | null } | null
  }
  transports: RideShareData[]
  guests: number
  onTransportCostChange?: (cost: number) => void
}

type TripType = "round_trip" | "outbound" | "return"

const TRIP_LABELS: Record<TripType, string> = {
  round_trip: "Tur-retur",
  outbound:   "Udrejse",
  return:     "Hjemrejse",
}

export default function CabinTransportSection({ cabin, transports, guests, onTransportCostChange }: Props) {
  const pricePerSeat = cabin.transport_price_per_person_ore ?? 0
  const hostName     = cabin.profiles?.full_name ?? "Udbyderen"

  const [selectedType, setSelectedType] = useState<TripType | null>(null)

  const costMap: Record<TripType, number> = {
    round_trip: pricePerSeat * guests * 2,
    outbound:   pricePerSeat * guests,
    return:     pricePerSeat * guests,
  }
  const transportCostOre = selectedType ? costMap[selectedType] : 0

  useEffect(() => {
    onTransportCostChange?.(transportCostOre)
  }, [transportCostOre, onTransportCostChange])

  /* ── Transport request form ── */
  const [showRequest, setShowRequest] = useState(false)
  const [reqSent, setReqSent]         = useState(false)
  const [reqPending, setReqPending]   = useState(false)
  const [reqForm, setReqForm] = useState({
    from_location: cabin.location_hub,
    to_location:   cabin.location_hub,
    travel_date:   "",
    passengers:    guests || 1,
    message:       "",
  })

  async function handleSubmitRequest() {
    if (!reqForm.travel_date) return
    setReqPending(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setReqPending(false); return }

    const fromHub = GREENLAND_LOCATIONS.find((l) => l.name_dk === reqForm.from_location)
    const toHub   = GREENLAND_LOCATIONS.find((l) => l.name_dk === reqForm.to_location)

    await supabase.from("transport_requests").insert({
      guest_id:        user.id,
      from_location:   reqForm.from_location,
      from_latitude:   fromHub?.latitude  ?? 0,
      from_longitude:  fromHub?.longitude ?? 0,
      to_location:     reqForm.to_location,
      to_latitude:     toHub?.latitude    ?? 0,
      to_longitude:    toHub?.longitude   ?? 0,
      desired_date:    reqForm.travel_date,
      num_passengers:  reqForm.passengers,
      description:     reqForm.message || null,
      status:          "open",
    })
    setReqPending(false)
    setReqSent(true)
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-foreground mb-4">Kom dertil</h2>

      {/* ── HOST-PROVIDED TRANSPORT ── */}
      {cabin.offers_transport && pricePerSeat > 0 && (
        <div className="bg-primary/5 border border-primary/15 rounded-2xl p-5 mb-5">
          <div className="flex items-center gap-2 mb-2">
            <Anchor className="w-5 h-5 text-primary" />
            <span className="font-semibold text-foreground">Værtens transport</span>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            <strong>{hostName}</strong> tilbyder transport til hytten.
          </p>

          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Jeg ønsker
          </p>
          <div className="space-y-2 mb-3">
            {(["round_trip", "outbound", "return"] as TripType[]).map((type) => {
              const cost   = costMap[type]
              const active = selectedType === type
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedType(active ? null : type)}
                  className={`w-full text-left rounded-xl border p-3.5 transition-all flex items-center justify-between ${
                    active
                      ? "bg-primary/10 border-primary text-foreground"
                      : "bg-white border-border hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${active ? "border-primary" : "border-muted-foreground/40"}`}>
                      {active && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                    <span className="text-sm font-medium">{TRIP_LABELS[type]}</span>
                  </div>
                  <span className={`text-sm font-bold ${active ? "text-primary" : "text-foreground"}`}>
                    {formatKr(cost)}
                  </span>
                </button>
              )
            })}
          </div>

          {selectedType && (
            <div className="bg-white rounded-lg px-3 py-2 text-xs text-muted-foreground">
              {formatKr(pricePerSeat)} × {guests} {guests !== 1 ? "gæster" : "gæst"}
              {selectedType === "round_trip" ? " × 2 (tur-retur)" : ""} ={" "}
              <span className="font-semibold text-foreground">{formatKr(transportCostOre)}</span>{" "}
              <span className="text-muted-foreground/60">(lægges til totalen)</span>
            </div>
          )}
        </div>
      )}

      {!cabin.offers_transport && (
        <p className="text-sm text-muted-foreground mb-4">Udbyderen tilbyder ikke transport til denne hytte.</p>
      )}

      {/* ── OTHER TRANSPORT LISTINGS ── */}
      <div className="mb-5">
        <p className="text-sm font-bold text-foreground mb-3">
          Andre transportmuligheder til <strong>{cabin.location_hub}</strong>:
        </p>
        {transports.length > 0 ? (
          <div className="space-y-3">
            {transports.map((tr) => (
              <div
                key={tr.id}
                className="bg-white border border-border rounded-xl p-4 flex items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-foreground flex-wrap">
                    <span>{tr.from_location}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span>{tr.to_location}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                    <span>{format(new Date(tr.departure_at), "d. MMM yyyy")}</span>
                    <span>{tr.seats_available} plads{tr.seats_available !== 1 ? "er" : ""} tilbage</span>
                    <span className="font-semibold text-foreground">{formatKr(tr.price_per_seat_ore)}/sæde</span>
                  </div>
                  {tr.profiles?.full_name && (
                    <p className="text-xs text-muted-foreground/60 mt-0.5">{tr.profiles.full_name}</p>
                  )}
                </div>
                <Link
                  href={`/transport/${tr.id}`}
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
                >
                  Se &amp; Book
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground bg-muted rounded-xl p-4">
            Ingen planlagte ture til {cabin.location_hub} lige nu.
          </p>
        )}
      </div>

      {/* ── REQUEST CTA ── */}
      {!showRequest && !reqSent && (
        <div className="flex items-center gap-3 mt-2">
          <span className="text-sm text-muted-foreground">Passer datoen ikke?</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRequest(true)}
            className="gap-1.5 rounded-xl shrink-0"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Anmod om transport
          </Button>
        </div>
      )}

      {/* ── REQUEST FORM ── */}
      <AnimatePresence>
        {showRequest && !reqSent && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 bg-muted/60 border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-foreground text-sm">Anmod om transport</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Vi finder en sejler til dig</p>
                </div>
                <button onClick={() => setShowRequest(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Fra</label>
                    <select
                      value={reqForm.from_location}
                      onChange={(e) => setReqForm((p) => ({ ...p, from_location: e.target.value }))}
                      className="w-full h-9 px-3 rounded-md border border-input bg-white text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Til</label>
                    <select
                      value={reqForm.to_location}
                      onChange={(e) => setReqForm((p) => ({ ...p, to_location: e.target.value }))}
                      className="w-full h-9 px-3 rounded-md border border-input bg-white text-sm focus:outline-none focus:ring-1 focus:ring-ring"
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
                      value={reqForm.travel_date}
                      onChange={(e) => setReqForm((p) => ({ ...p, travel_date: e.target.value }))}
                      min={new Date().toISOString().split("T")[0]}
                      className="bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Passagerer</label>
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      value={reqForm.passengers}
                      onChange={(e) => setReqForm((p) => ({ ...p, passengers: Number(e.target.value) }))}
                      className="bg-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Besked (valgfrit)</label>
                  <Textarea
                    value={reqForm.message}
                    onChange={(e) => setReqForm((p) => ({ ...p, message: e.target.value }))}
                    placeholder="Fortæl os mere om din tur..."
                    rows={2}
                    className="resize-none bg-white"
                  />
                </div>
                <Button
                  onClick={handleSubmitRequest}
                  disabled={!reqForm.travel_date || reqPending}
                  className="w-full bg-primary text-primary-foreground rounded-xl h-10 font-semibold text-sm"
                >
                  {reqPending ? "Sender..." : "Send anmodning"}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SUCCESS ── */}
      {reqSent && (
        <div className="mt-4 bg-green-50 border border-green-200 rounded-2xl p-4 flex items-start gap-3">
          <div className="w-7 h-7 bg-green-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
            <Check className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-green-800">Anmodning sendt!</p>
            <p className="text-xs text-green-700 mt-0.5">Sejlere i området vil se din anmodning og kontakte dig.</p>
            <button onClick={() => { setReqSent(false); setShowRequest(false) }} className="text-xs text-green-600 underline mt-1">
              Send en til
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
