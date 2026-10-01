"use client"

import { useEffect, useState, useTransition } from "react"
import dynamic from "next/dynamic"
import {
  Anchor, ArrowRight, Backpack, Calendar, Check, ChevronLeft, Clock, CloudSun,
  LifeBuoy, MapPin, MessageSquare, Minus, Plus, ShieldCheck, Shirt, Star, Timer, User, Users,
} from "lucide-react"
import { useFormatter, useTranslations } from "next-intl"
import { toast } from "sonner"
import { Link, useRouter } from "@/i18n/navigation"
import { getLocationName } from "@/lib/greenlandLocations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { formatKr, calcServiceFee, calcDisplayPrice } from "@/lib/money"
import { nuukTodayYmd } from "@/lib/nuukTime"
import { createTransportRequest } from "./actions"
import ServiceFeeHelpIcon from "@/components/shared/ServiceFeeHelpIcon"
import { captureEvent, PH_STORE } from "@/lib/analytics/posthog-events"

const NUUK_TZ = "America/Godthab"

function MapLoading() {
  const t = useTranslations("transport")
  return (
    <div className="w-full h-56 sm:h-72 bg-muted rounded-2xl flex items-center justify-center">
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        {t("loading")}
      </div>
    </div>
  )
}

const TransportMap = dynamic(() => import("@/components/map/TransportMap"), {
  ssr: false,
  loading: () => <MapLoading />,
})

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
  return_ride_share_id?: string | null
  estimated_duration_minutes?: number | null
  meeting_point?: string | null
  luggage_allowance?: "small" | "medium" | "large" | null
  flexibility_minutes?: number | null
  boats?: {
    name: string | null
    capacity: number | null
    safety_confirmed: boolean | null
    operator_type: "private" | "commercial" | null
  } | null
  profiles: { id: string; full_name: string | null; avatar_url: string | null } | null
}

interface Props {
  rideShare: RideShareDetail
  returnTrips: RideShareDetail[]
  alternativeReturnTrips: RideShareDetail[]
  reviews: ReviewData[]
  isLoggedIn: boolean
  /** true når den indloggede bruger selv er sejler på turen */
  isOwnTrip?: boolean
  /** Beregnet på serveren: afgangstidspunktet er passeret */
  departed?: boolean
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-hidden>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`w-4 h-4 ${n <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-muted"}`}
        />
      ))}
    </div>
  )
}

function Fact({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="bg-muted rounded-xl p-3 min-w-0">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        {icon}
        {label}
      </div>
      <p className="font-semibold text-sm text-foreground break-words">{children}</p>
    </div>
  )
}

export default function TransportDetailClient({
  rideShare,
  returnTrips,
  alternativeReturnTrips,
  reviews,
  isLoggedIn,
  isOwnTrip = false,
  departed = false,
}: Props) {
  const router = useRouter()
  const fmt = useFormatter()
  const t = useTranslations("transport")
  const tBooking = useTranslations("booking")
  const tCommon = useTranslations("common")

  useEffect(() => {
    captureEvent("transport_viewed", {
      ride_share_id: rideShare.id,
      from_location: rideShare.from_location,
      to_location: rideShare.to_location,
      price_per_seat: Math.round(rideShare.price_per_seat_ore / 100),
    })
  }, [rideShare.id, rideShare.from_location, rideShare.to_location, rideShare.price_per_seat_ore])

  const fromName = getLocationName(rideShare.from_location)
  const toName = getLocationName(rideShare.to_location)

  const dateLong = (iso: string) =>
    fmt.dateTime(new Date(iso), { timeZone: NUUK_TZ, weekday: "long", day: "numeric", month: "long" })
  const dateShort = (iso: string) =>
    fmt.dateTime(new Date(iso), { timeZone: NUUK_TZ, weekday: "short", day: "numeric", month: "short" })
  const timeOf = (iso: string) =>
    fmt.dateTime(new Date(iso), { timeZone: NUUK_TZ, hour: "2-digit", minute: "2-digit" })

  const soldOut = rideShare.seats_available <= 0 || rideShare.status === "full"
  const maxSeats = Math.max(1, rideShare.seats_available)
  const [seats, setSeats] = useState(1)
  const [bookPending, setBookPending] = useState(false)

  const priceOre = rideShare.price_per_seat_ore
  const subtotal = seats * priceOre
  const serviceFee = subtotal > 0 ? calcServiceFee(subtotal) : 0
  const guestTotal = subtotal + serviceFee

  const loginHref = `/login?next=${encodeURIComponent(`/transport/${rideShare.id}`)}`

  async function handleBook() {
    if (bookPending) return
    setBookPending(true)
    try {
      const res = await fetch("/api/transport/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ride_share_id: rideShare.id, seats_booked: seats }),
      })
      const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string }
      if (!res.ok || !json.url) {
        toast.error(json.error ?? tCommon("error"))
        if (res.status === 409) router.refresh()
        setBookPending(false)
        return
      }
      try {
        sessionStorage.setItem(
          PH_STORE.transportCheckout,
          JSON.stringify({
            ride_share_id: rideShare.id,
            seats,
            total_price_ore: subtotal,
            service_fee_ore: serviceFee,
            guest_total_ore: guestTotal,
          }),
        )
      } catch {
        /* sessionStorage kan være blokeret */
      }
      captureEvent("transport_booking_started", {
        ride_share_id: rideShare.id,
        from_location: rideShare.from_location,
        to_location: rideShare.to_location,
        seats,
        roundtrip: false,
      })
      // Stripe Checkout er ekstern — fuld navigation. Knappen forbliver låst.
      window.location.assign(json.url)
    } catch {
      toast.error(t("connection_error"))
      setBookPending(false)
    }
  }

  /* ── Anmod om returtur (omvendt rute) ── */
  const [showReq, setShowReq] = useState(false)
  const [reqSent, setReqSent] = useState(false)
  const [reqError, setReqError] = useState<string | null>(null)
  const [reqPending, startReq] = useTransition()
  const [reqDate, setReqDate] = useState("")
  const [reqGuests, setReqGuests] = useState(1)
  const [reqNotes, setReqNotes] = useState("")

  function handleSendRequest() {
    if (!reqDate) return
    if (!isLoggedIn) {
      router.push(loginHref)
      return
    }
    setReqError(null)
    startReq(async () => {
      try {
        const res = await createTransportRequest({
          from_location: toName,
          to_location: fromName,
          departure_date: reqDate,
          num_guests: reqGuests,
          notes: reqNotes || undefined,
        })
        if ("error" in res) {
          setReqError(res.error)
          return
        }
        captureEvent("transport_request_created", {
          from_location: rideShare.to_location,
          to_location: rideShare.from_location,
          num_guests: reqGuests,
        })
        setReqSent(true)
        setShowReq(false)
      } catch {
        setReqError(t("request_failed"))
      }
    })
  }

  const avgRating =
    reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null

  const duration = rideShare.estimated_duration_minutes ?? null
  const durationLabel =
    duration == null
      ? null
      : duration < 60
        ? `${duration} min`
        : `${Math.floor(duration / 60)} t${duration % 60 ? ` ${duration % 60} min` : ""}`

  const flex = rideShare.flexibility_minutes
  const flexLabel =
    flex == null
      ? null
      : flex === 0
        ? t("detail_flex_0")
        : flex % 60 === 0
          ? t("detail_flex_h", { hours: flex / 60 })
          : t("detail_flex_n", { minutes: flex })

  const boatLabel = rideShare.boats?.name || rideShare.boat_description
  const sailorName = rideShare.profiles?.full_name ?? t("sailor_fallback")
  const allReturns = [...returnTrips, ...alternativeReturnTrips]

  const bookingCard = (
    <section
      id="book"
      aria-labelledby="book-title"
      className="bg-white rounded-2xl border border-border shadow-sm p-5 sm:p-6"
    >
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <h2 id="book-title" className="text-lg font-bold text-foreground">
          {t("book_title")}
        </h2>
        <p className="text-right">
          <span className="text-xl font-bold text-foreground tabular-nums">
            {formatKr(calcDisplayPrice(priceOre))}
          </span>
          <span className="text-xs text-muted-foreground"> / {t("price_per_seat")}</span>
        </p>
      </div>

      {departed ? (
        <p role="status" className="text-sm text-muted-foreground bg-muted rounded-xl p-4 text-center">
          {t("departed")}
        </p>
      ) : isOwnTrip ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground bg-muted rounded-xl p-4">{t("own_trip_note")}</p>
          <Button asChild className="w-full h-12 rounded-xl font-semibold bg-[#114788] hover:bg-[#114788]/90 text-white">
            <Link href={`/dashboard/sejlads/${rideShare.id}`}>{t("own_trip_cta")}</Link>
          </Button>
        </div>
      ) : soldOut ? (
        <div className="space-y-3">
          <p role="status" className="text-sm text-foreground bg-muted rounded-xl p-4 text-center font-medium">
            {t("sold_out")}
          </p>
          <Button asChild variant="outline" className="w-full h-11 rounded-xl font-semibold">
            <Link
              href={`/transport/anmod?from=${encodeURIComponent(fromName)}&to=${encodeURIComponent(toName)}`}
            >
              {t("sold_out_request_cta")}
            </Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-sm font-semibold text-foreground">{t("seats_label")}</p>
              <p className="text-xs text-muted-foreground">
                {t("seats_available", { count: rideShare.seats_available })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSeats((s) => Math.max(1, s - 1))}
                disabled={seats <= 1}
                aria-label={t("seats_decrease")}
                className="w-11 h-11 rounded-full border border-border flex items-center justify-center text-foreground disabled:opacity-40 hover:border-[#114788] transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-8 text-center text-lg font-bold tabular-nums" aria-live="polite">
                {seats}
              </span>
              <button
                type="button"
                onClick={() => setSeats((s) => Math.min(maxSeats, s + 1))}
                disabled={seats >= maxSeats}
                aria-label={t("seats_increase")}
                className="w-11 h-11 rounded-full border border-border flex items-center justify-center text-foreground disabled:opacity-40 hover:border-[#114788] transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="bg-muted rounded-xl p-4 mb-4 text-sm space-y-1.5">
            <div className="flex justify-between text-muted-foreground">
              <span>
                {formatKr(priceOre)} × {seats}
              </span>
              <span className="tabular-nums">{formatKr(subtotal)}</span>
            </div>
            {serviceFee > 0 && (
              <div className="flex justify-between text-muted-foreground items-center gap-2">
                <span className="inline-flex items-center gap-1.5 min-w-0">
                  {t("booking_service_fee_3")}
                  <ServiceFeeHelpIcon
                    tooltipText={t("booking_service_fee_hint")}
                    ariaLabel={t("booking_service_fee_aria")}
                  />
                </span>
                <span className="tabular-nums">{formatKr(serviceFee)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-foreground pt-1.5 border-t border-border">
              <span>{tBooking("total")}</span>
              <span className="tabular-nums">{formatKr(guestTotal)}</span>
            </div>
          </div>

          {isLoggedIn ? (
            <Button
              onClick={handleBook}
              disabled={bookPending}
              className="w-full h-12 rounded-xl font-semibold bg-[#114788] hover:bg-[#114788]/90 text-white"
            >
              {bookPending ? t("drawer_opening_payment") : t("book_outbound_now", { amount: formatKr(guestTotal) })}
            </Button>
          ) : (
            <Button asChild className="w-full h-12 rounded-xl font-semibold bg-[#114788] hover:bg-[#114788]/90 text-white">
              <Link href={loginHref}>{t("login_to_book")}</Link>
            </Button>
          )}

          <ul className="mt-4 space-y-1.5 text-xs text-muted-foreground">
            <li className="flex gap-2">
              <Check className="w-3.5 h-3.5 mt-0.5 text-green-600 shrink-0" />
              {t("safety_cancellation")}
            </li>
            <li className="flex gap-2">
              <Check className="w-3.5 h-3.5 mt-0.5 text-green-600 shrink-0" />
              {t("book_weather_refund")}
            </li>
            <li className="flex gap-2">
              <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              {t("book_chat_after_payment")}
            </li>
          </ul>
        </>
      )}
    </section>
  )

  return (
    <div className="min-h-screen pt-16 bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Link
          href="/transport"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors py-1"
        >
          <ChevronLeft className="w-4 h-4" />
          {t("back_to_list")}
        </Link>

        {/* ── Overskrift ── */}
        <header className="mb-5">
          <h1 className="flex items-center gap-2 text-2xl sm:text-3xl font-bold text-foreground flex-wrap">
            <span>{fromName}</span>
            <ArrowRight className="w-6 h-6 text-[#114788] shrink-0" aria-label={t("to")} />
            <span>{toName}</span>
          </h1>
          <p className="mt-1 text-base text-foreground first-letter:uppercase">
            {dateLong(rideShare.departure_at)} · {t("at_time", { time: timeOf(rideShare.departure_at) })}{" "}
            <span className="text-sm text-muted-foreground">({t("local_time")})</span>
          </p>
        </header>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-x-8 lg:items-start">
          <div className="space-y-5 min-w-0">
            {/* ── Kort ── */}
            {rideShare.from_latitude && rideShare.to_latitude ? (
              <TransportMap
                mode="detail"
                routes={[
                  {
                    id: rideShare.id,
                    fromName,
                    fromLat: rideShare.from_latitude,
                    fromLng: rideShare.from_longitude ?? 0,
                    toName,
                    toLat: rideShare.to_latitude,
                    toLng: rideShare.to_longitude ?? 0,
                  },
                ]}
                analyticsType="transport"
                className="w-full h-56 sm:h-72"
              />
            ) : (
              <div className="w-full h-40 bg-muted rounded-2xl flex items-center justify-center">
                <Anchor className="w-12 h-12 text-muted-foreground/30" />
              </div>
            )}

            {/* ── Fakta ── */}
            <section className="bg-white rounded-2xl border border-border shadow-sm p-5 sm:p-6">
              <h2 className="text-base font-bold text-foreground mb-3">{t("about_trip")}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Fact icon={<Calendar className="w-3.5 h-3.5" />} label={tCommon("date")}>
                  <span className="first-letter:uppercase inline-block">{dateShort(rideShare.departure_at)}</span>
                </Fact>
                <Fact icon={<Clock className="w-3.5 h-3.5" />} label={t("departure")}>
                  {timeOf(rideShare.departure_at)}
                  {flexLabel && <span className="block text-xs font-normal text-muted-foreground">{flexLabel}</span>}
                </Fact>
                {durationLabel && (
                  <Fact icon={<Timer className="w-3.5 h-3.5" />} label={t("detail_duration")}>
                    {t("detail_duration_value", { time: durationLabel })}
                  </Fact>
                )}
                <Fact icon={<Users className="w-3.5 h-3.5" />} label={tCommon("seats")}>
                  {t("seats_of_total", { available: Math.max(0, rideShare.seats_available), total: rideShare.total_seats })}
                </Fact>
                {boatLabel && (
                  <Fact icon={<Anchor className="w-3.5 h-3.5" />} label={t("boat")}>
                    {boatLabel}
                  </Fact>
                )}
                {rideShare.luggage_allowance && (
                  <Fact icon={<Backpack className="w-3.5 h-3.5" />} label={t("detail_luggage")}>
                    {t(`detail_luggage_${rideShare.luggage_allowance}`)}
                  </Fact>
                )}
              </div>

              {rideShare.meeting_point && (
                <div className="mt-3 flex gap-2.5 rounded-xl border border-border p-3">
                  <MapPin className="w-4 h-4 text-[#114788] shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{t("detail_meeting_point")}</p>
                    <p className="text-sm font-medium text-foreground break-words">{rideShare.meeting_point}</p>
                  </div>
                </div>
              )}

              {rideShare.description && (
                <p className="mt-4 text-sm text-foreground/80 leading-relaxed whitespace-pre-line break-words">
                  {rideShare.description}
                </p>
              )}
            </section>

          </div>

          {/* ── Booking: efter fakta på mobil, sticky højre kolonne på desktop ── */}
          <aside className="min-w-0 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-24">
            {bookingCard}
          </aside>

          <div className="space-y-5 min-w-0 lg:col-start-1">
            {/* ── Sikkerhed og vilkår ── */}
            <section className="bg-white rounded-2xl border border-border shadow-sm p-5 sm:p-6">
              <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#114788]" />
                {t("safety_title")}
              </h2>
              <ul className="space-y-3 text-sm text-foreground/90">
                <li className="flex gap-3">
                  <LifeBuoy className="w-4 h-4 mt-0.5 text-[#114788] shrink-0" />
                  <span>{t("safety_lifejackets")}</span>
                </li>
                {rideShare.boats?.safety_confirmed && (
                  <li className="flex gap-3">
                    <Check className="w-4 h-4 mt-0.5 text-[#114788] shrink-0" />
                    <span>{t("safety_equipment_confirmed")}</span>
                  </li>
                )}
                <li className="flex gap-3">
                  <Users className="w-4 h-4 mt-0.5 text-[#114788] shrink-0" />
                  <span>{t("safety_max_pax", { count: rideShare.total_seats })}</span>
                </li>
                <li className="flex gap-3">
                  <CloudSun className="w-4 h-4 mt-0.5 text-[#114788] shrink-0" />
                  <span>{t("safety_weather")}</span>
                </li>
                <li className="flex gap-3">
                  <Shirt className="w-4 h-4 mt-0.5 text-[#114788] shrink-0" />
                  <span>{t("safety_clothing")}</span>
                </li>
              </ul>
              {rideShare.boats?.operator_type === "commercial" && (
                <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#114788]/10 text-[#114788] text-xs font-semibold px-3 py-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {t("safety_commercial")}
                </p>
              )}
            </section>

            {/* ── Retur ── */}
            {!isOwnTrip && (
              <section className="bg-white rounded-2xl border border-border shadow-sm p-5 sm:p-6">
                <h2 className="text-base font-bold text-foreground mb-1">{t("return_title", { from: toName, to: fromName })}</h2>
                <p className="text-sm text-muted-foreground mb-4">{t("return_booked_separately")}</p>

                {allReturns.length > 0 ? (
                  <ul className="space-y-2 mb-4">
                    {allReturns.map((rt) => {
                      const sameSailor = rt.sejler_id === rideShare.sejler_id
                      return (
                        <li key={rt.id}>
                          <Link
                            href={`/transport/${rt.id}`}
                            className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 hover:border-[#114788] transition-colors"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground first-letter:uppercase">
                                {dateShort(rt.departure_at)} · {timeOf(rt.departure_at)}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {sameSailor ? t("return_same_sailor") : rt.profiles?.full_name ?? t("sailor_fallback")}
                                {" · "}
                                {rt.seats_available > 0
                                  ? t("seats_available", { count: rt.seats_available })
                                  : t("sold_out")}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-bold text-foreground tabular-nums">
                                {formatKr(calcDisplayPrice(rt.price_per_seat_ore))}
                              </p>
                              <p className="text-xs text-[#114788] font-medium">{t("see_return_trip")}</p>
                            </div>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground bg-muted rounded-xl p-4 mb-4">{t("return_none")}</p>
                )}

                {reqSent ? (
                  <div role="status" className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
                    <Check className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-green-800">{t("return_request_sent")}</p>
                      <p className="text-xs text-green-700 mt-0.5">{t("return_request_sent_body")}</p>
                      <Link href="/dashboard?tab=mine-oensker" className="text-xs font-medium text-green-800 underline mt-1 inline-block">
                        {t("return_request_see")}
                      </Link>
                    </div>
                  </div>
                ) : !showReq ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowReq(true)}
                    className="w-full h-11 rounded-xl font-semibold border-[#114788] text-[#114788] hover:bg-[#114788]/10"
                  >
                    <MessageSquare className="w-4 h-4" />
                    {t("return_request_cta")}
                  </Button>
                ) : (
                  <div className="space-y-3 rounded-xl border border-border p-4">
                    <p className="text-xs text-muted-foreground">{t("return_request_hint")}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="req-date" className="text-xs font-semibold text-muted-foreground block mb-1.5">
                          {t("return_request_date")}
                        </label>
                        <Input
                          id="req-date"
                          type="date"
                          value={reqDate}
                          min={nuukTodayYmd()}
                          onChange={(e) => setReqDate(e.target.value)}
                          className="h-11"
                        />
                      </div>
                      <div>
                        <label htmlFor="req-guests" className="text-xs font-semibold text-muted-foreground block mb-1.5">
                          {t("return_request_passengers")}
                        </label>
                        <Input
                          id="req-guests"
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={12}
                          value={reqGuests}
                          onChange={(e) =>
                            setReqGuests(Math.max(1, Math.min(12, Math.floor(Number(e.target.value)) || 1)))
                          }
                          className="h-11"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="req-notes" className="text-xs font-semibold text-muted-foreground block mb-1.5">
                        {t("return_request_notes")}
                      </label>
                      <Textarea
                        id="req-notes"
                        value={reqNotes}
                        onChange={(e) => setReqNotes(e.target.value)}
                        rows={2}
                        maxLength={500}
                        className="resize-none"
                      />
                    </div>
                    {reqError && (
                      <p role="alert" className="text-sm text-destructive">
                        {reqError}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Button type="button" variant="ghost" onClick={() => setShowReq(false)} className="h-11 rounded-xl">
                        {tCommon("cancel")}
                      </Button>
                      <Button
                        type="button"
                        onClick={handleSendRequest}
                        disabled={!reqDate || reqPending}
                        className="flex-1 h-11 rounded-xl font-semibold bg-[#114788] hover:bg-[#114788]/90 text-white"
                      >
                        {reqPending ? tCommon("sending") : isLoggedIn ? t("return_request_send") : t("login_to_request")}
                      </Button>
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* ── Sejleren ── */}
            {rideShare.profiles && (
              <section className="bg-white rounded-2xl border border-border shadow-sm p-5 sm:p-6">
                <h2 className="text-base font-bold text-foreground mb-3">{t("about_skipper_title")}</h2>
                <Link
                  href={`/profil/${rideShare.profiles.id}`}
                  className="flex items-center gap-4 p-3 bg-muted/40 rounded-2xl hover:bg-muted transition-colors min-w-0"
                >
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                    {rideShare.profiles.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={rideShare.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-6 h-6 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground break-words">{sailorName}</p>
                    {avgRating != null && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        {avgRating.toFixed(1)} · {t("reviews_count", { count: reviews.length })}
                      </p>
                    )}
                    <p className="text-sm text-[#114788] font-medium">{t("view_profile")}</p>
                  </div>
                </Link>
              </section>
            )}

            {/* ── Anmeldelser ── */}
            <section className="bg-white rounded-2xl border border-border shadow-sm p-5 sm:p-6">
              <h2 className="text-base font-bold text-foreground mb-4">
                {t("reviews_title")}
                {avgRating != null && (
                  <span className="font-normal text-muted-foreground"> · {avgRating.toFixed(1)} ★</span>
                )}
              </h2>
              {reviews.length === 0 ? (
                <p className="text-sm text-muted-foreground bg-muted rounded-xl p-4 text-center">{t("reviews_empty")}</p>
              ) : (
                <ul className="space-y-3">
                  {reviews.map((r) => (
                    <li key={r.id} className="rounded-xl border border-border p-4">
                      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground">
                          {r.profiles?.full_name ?? t("review_anonymous")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {fmt.dateTime(new Date(r.created_at), { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <StarRow rating={r.rating} />
                      <span className="sr-only">{t("review_rating_sr", { rating: r.rating })}</span>
                      {r.comment && (
                        <p className="text-sm text-muted-foreground mt-2 leading-relaxed break-words">{r.comment}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

        </div>
      </div>
    </div>
  )
}
