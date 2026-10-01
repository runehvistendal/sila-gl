"use client"

import { useCallback, useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { useFormatPrice } from "@/hooks/useFormatPrice"
import { format as formatDate, parseISO } from "date-fns"
import { Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
  createCabinBooking,
  type AcceptedTransportOfferProp,
  type TransportTrip,
} from "@/app/actions/bookings"
import { createCabinTransportRequest } from "@/app/actions/cabinTransportRequests"
import { cn } from "@/lib/utils"
import { captureEvent, PH_STORE } from "@/lib/analytics/posthog-events"
import { calcServiceFee, oreToKr, calcDisplayPrice } from "@/lib/money"
import type { TransferRoute } from "@/types/transfer"
import { CalendarDropdown } from "@/components/shared/CalendarDropdown"
import { localTodayYmd } from "@/lib/calendarYmd"
import {
  getArrivalPoints,
  getLocationName,
  type ArrivalPoint,
} from "@/lib/greenlandLocations"

const DRAFT_KEY = "sila_cabin_booking_draft_v1"

type Draft = {
  cabinId: string
  checkIn: string
  checkOut: string
  guests: number
  transport: TransportTrip
  transferRouteId?: string | null
  transferRoundTrip?: boolean
}

type CabinProps = {
  id: string
  max_guests: number
  price_per_night_ore: number
  offers_transport: boolean
  transport_price_per_person_ore: number | null
  min_nights?: number
  location_hub: string
  instant_book: boolean
  /** `residence` = i-byen (fx «Book bolig»); default hytte-kopi */
  property_type?: "cabin" | "residence" | null
}

type Props = {
  cabin: CabinProps
  isLoggedIn: boolean
  loginNextPath: string
  /** Optagne/blokerede nætter (YYYY-MM-DD) */
  disabledYmd: string[]
  /** Kaldes når gæsteantal ændres — bruges til at synkronisere med CabinTransportSection */
  onGuestsChange?: (guests: number) => void
  /** Strukturerede transferruter fra `transfer_routes` (server-hentet) */
  transferRoutes?: TransferRoute[]
  /** Fx /ophold/i-naturen/[id]: anmod om transport når der ikke er strukturerede ruter */
  enableCabinTransportRequest?: boolean
  /** Accepteret hytte-transportbud — kun uden strukturerede transfer_ruter */
  acceptedTransportOffer?: AcceptedTransportOfferProp | null
  /** Om gæsten allerede har en åben cabin_transport_request på denne hytte */
  hasOpenTransportRequest?: boolean
}

function parseYmdLocal(s: string): Date {
  return parseISO(s + "T12:00:00")
}

function fmtOreKrLine(ore: number): string {
  return `${oreToKr(ore).toLocaleString("da-DK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} kr`
}

function routeTransportIcon(t: TransferRoute["transport_type"]): string {
  return t === "boat" ? "🚤" : "🚗"
}

export default function CabinBookingWidget({
  cabin,
  isLoggedIn,
  loginNextPath,
  disabledYmd,
  onGuestsChange,
  transferRoutes = [],
  enableCabinTransportRequest = false,
  acceptedTransportOffer = null,
  hasOpenTransportRequest = false,
}: Props) {
  const router = useRouter()
  const t = useTranslations("cabins")
  const tCommon = useTranslations("common")
  const formatPrice = useFormatPrice()
  const [pending, start] = useTransition()
  const [transportPending, startTransport] = useTransition()
  const todayYmd = localTodayYmd()

  const [transportRequestExpanded, setTransportRequestExpanded] = useState(false)
  const [transportRequestSuccess, setTransportRequestSuccess] = useState(false)
  const [transportRequestError, setTransportRequestError] = useState<string | null>(
    null,
  )
  const [transportArrivalPoint, setTransportArrivalPoint] =
    useState<ArrivalPoint>("harbour")
  const [transportArrivalDate, setTransportArrivalDate] = useState("")
  const [transportReturnDate, setTransportReturnDate] = useState("")
  const [transportReqPersons, setTransportReqPersons] = useState("1")
  const [transportMessage, setTransportMessage] = useState("")

  const disabledSet = useMemo(
    () => new Set(disabledYmd),
    [disabledYmd],
  )

  const [range, setRange] = useState<
    { from: Date; to?: Date } | undefined
  >(undefined)
  const [guestsInput, setGuestsInput] = useState("1")
  const [transport, setTransport] = useState<TransportTrip>(
    cabin.offers_transport ? "outbound" : "none"
  )
  const [selectedTransferRouteId, setSelectedTransferRouteId] = useState<string | null>(null)
  const [transferIsRoundtrip, setTransferIsRoundtrip] = useState(false)

  const TRIP_OPTIONS: { value: TransportTrip; label: string }[] = [
    { value: "outbound", label: t("booking_trip_outbound_only") },
    { value: "return",   label: t("booking_trip_return_only") },
    { value: "round_trip", label: t("booking_trip_round_trip") },
  ]

  const guests = Math.floor(Number(guestsInput)) || 0
  const guestInvalid = guests < 1 || guests > cabin.max_guests

  useEffect(() => {
    if (guests >= 1) onGuestsChange?.(guests)
  }, [guests, onGuestsChange])

  const guestError =
    guestInvalid && guestsInput !== ""
      ? guests > cabin.max_guests
        ? t("booking_error_max_guests", { count: cabin.max_guests })
        : t("booking_error_min_guest")
      : null

  const checkIn =
    range?.from && !isNaN(range.from.getTime())
      ? formatDate(range.from, "yyyy-MM-dd")
      : ""
  const checkOut =
    range?.to && !isNaN(range.to.getTime())
      ? formatDate(range.to, "yyyy-MM-dd")
      : ""

  const nights =
    checkIn && checkOut
      ? Math.max(
          0,
          Math.round(
            (parseYmdLocal(checkOut).getTime() -
              parseYmdLocal(checkIn).getTime()) /
              86_400_000,
          ),
        )
      : 0

  const cabinTotalOre = nights * cabin.price_per_night_ore
  const perPerson = cabin.transport_price_per_person_ore ?? 0

  const structuredTransferOre = useMemo(() => {
    if (transferRoutes.length === 0 || !selectedTransferRouteId) return 0
    const r = transferRoutes.find((x) => x.id === selectedTransferRouteId)
    if (!r) return 0
    return transferIsRoundtrip ? r.price_roundtrip_ore : r.price_one_way_ore
  }, [transferRoutes, selectedTransferRouteId, transferIsRoundtrip])

  const legacyTransportOre = useMemo(() => {
    if (transferRoutes.length > 0) return 0
    if (!cabin.offers_transport || transport === "none" || perPerson <= 0) {
      return 0
    }
    if (transport === "round_trip") return perPerson * guests * 2
    if (transport === "outbound" || transport === "return") {
      return perPerson * guests
    }
    return 0
  }, [transferRoutes.length, cabin.offers_transport, transport, perPerson, guests])

  const hasAcceptedTransportOffer = Boolean(
    acceptedTransportOffer &&
      transferRoutes.length === 0 &&
      Number.isFinite(acceptedTransportOffer.price_ore) &&
      acceptedTransportOffer.price_ore > 0,
  )

  const acceptedOfferOre = useMemo(() => {
    if (!hasAcceptedTransportOffer || !acceptedTransportOffer) return 0
    return Math.floor(acceptedTransportOffer.price_ore)
  }, [hasAcceptedTransportOffer, acceptedTransportOffer])

  const transportAddonOre =
    transferRoutes.length > 0
      ? structuredTransferOre
      : acceptedOfferOre > 0
        ? acceptedOfferOre
        : legacyTransportOre
  const subtotalOre = cabinTotalOre + transportAddonOre
  const serviceFeeOre = subtotalOre > 0 ? calcServiceFee(subtotalOre) : 0
  const guestTotalOre = subtotalOre + serviceFeeOre

  const selectedTransferRoute = useMemo(
    () =>
      selectedTransferRouteId
        ? transferRoutes.find((x) => x.id === selectedTransferRouteId) ?? null
        : null,
    [transferRoutes, selectedTransferRouteId],
  )

  const transferGuestsInvalid =
    !!selectedTransferRoute && guests > selectedTransferRoute.max_guests

  const loginHref = `/login?next=${encodeURIComponent(loginNextPath)}`

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const d = JSON.parse(raw) as Draft
      if (d.cabinId !== cabin.id) return
      if (d.checkIn) {
        const from = parseYmdLocal(d.checkIn)
        const to = d.checkOut ? parseYmdLocal(d.checkOut) : undefined
        setRange({ from, to: to ?? from })
      }
      if (typeof d.guests === "number" && d.guests > 0) {
        setGuestsInput(String(d.guests))
      }
      if (d.transport) setTransport(d.transport)
      if (d.transferRouteId !== undefined) {
        setSelectedTransferRouteId(
          typeof d.transferRouteId === "string" ? d.transferRouteId : null,
        )
      }
      if (typeof d.transferRoundTrip === "boolean") {
        setTransferIsRoundtrip(d.transferRoundTrip)
      }
      sessionStorage.removeItem(DRAFT_KEY)
    } catch {
      /* ignore */
    }
  }, [cabin.id])

  const isUnavailableDay = useCallback(
    (ymd: string) => disabledSet.has(ymd),
    [disabledSet],
  )

  function persistDraft() {
    if (typeof window === "undefined") return
    const draft: Draft = {
      cabinId: cabin.id,
      checkIn,
      checkOut,
      guests: guestInvalid ? 1 : guests,
      transport,
      transferRouteId: selectedTransferRouteId,
      transferRoundTrip: transferIsRoundtrip,
    }
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  }

  const minNights = cabin.min_nights ?? 1

  function onBook() {
    if (guestInvalid || !checkIn || !checkOut) {
      if (guestInvalid) {
        toast.error(
          guests > cabin.max_guests
            ? t("booking_error_max_guests", { count: cabin.max_guests })
            : t("booking_error_min_guest"),
        )
      } else {
        toast.error(t("booking_error_select_dates"))
      }
      return
    }
    if (checkOut <= checkIn) {
      toast.error(t("booking_error_checkout_order"))
      return
    }
    if (nights < 1) {
      toast.error(t("booking_error_min_one_night"))
      return
    }
    if (nights < minNights) {
      toast.error(t("booking_error_min_nights", { count: minNights }))
      return
    }
    if (!isLoggedIn) {
      persistDraft()
      void router.push(loginHref)
      return
    }
    start(async () => {
      try {
        const payload: Parameters<typeof createCabinBooking>[0] = {
          cabin_id: cabin.id,
          check_in: checkIn,
          check_out: checkOut,
          guests,
          transport_trip:
            transferRoutes.length > 0
              ? "none"
              : hasAcceptedTransportOffer
                ? "none"
                : cabin.offers_transport
                  ? transport
                  : "none",
        }
        if (selectedTransferRouteId) {
          payload.transfer_route_id = selectedTransferRouteId
          payload.transfer_is_roundtrip = transferIsRoundtrip
          payload.transfer_price_ore = structuredTransferOre
        }
        if (hasAcceptedTransportOffer && acceptedTransportOffer) {
          payload.transport_offer_id = acceptedTransportOffer.id
        }
        const r = await createCabinBooking(payload)
        if ("error" in r) {
          toast.error(r.error)
          return
        }
        try {
          sessionStorage.setItem(
            PH_STORE.cabinCheckout,
            JSON.stringify({
              cabin_id: cabin.id,
              location: cabin.location_hub,
              nights,
              total_price_ore: subtotalOre,
              service_fee_ore: serviceFeeOre,
              guest_total_ore: guestTotalOre,
              instant_book: cabin.instant_book,
            }),
          )
        } catch {
          /* ignore */
        }
        captureEvent("booking_started", {
          cabin_id: cabin.id,
          location: cabin.location_hub,
          check_in: checkIn,
          check_out: checkOut,
          nights,
          total_price: Math.round(guestTotalOre / 100),
        })
        window.location.assign(r.url)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : tCommon("error"))
      }
    })
  }

  const needsLegacyTransportPrice =
    !hasAcceptedTransportOffer &&
    transferRoutes.length === 0 &&
    cabin.offers_transport &&
    perPerson <= 0

  const bookDisabled =
    pending ||
    guestInvalid ||
    transferGuestsInvalid ||
    nights < 1 ||
    nights < minNights ||
    !checkIn ||
    !checkOut ||
    needsLegacyTransportPrice

  const arrivalPointTypes = useMemo((): ArrivalPoint[] => {
    const pts = getArrivalPoints(cabin.location_hub)
    return pts.length > 0 ? pts : ["harbour"]
  }, [cabin.location_hub])

  const arrivalSelectOptions = useMemo(() => {
    const place = getLocationName(cabin.location_hub)
    return arrivalPointTypes.map((pt) => ({
      value: pt,
      label:
        pt === "airport"
          ? `${t("booking_transport_arrival_airport")} · ${place}`
          : pt === "helipad"
            ? `${t("booking_transport_arrival_helipad")} · ${place}`
            : `${t("booking_transport_arrival_harbour")} · ${place}`,
    }))
  }, [arrivalPointTypes, cabin.location_hub, t])

  useEffect(() => {
    setTransportRequestSuccess(false)
    setTransportRequestExpanded(false)
    setTransportRequestError(null)
    setTransportReturnDate("")
  }, [cabin.id])

  function openTransportRequestFlow() {
    if (!isLoggedIn) {
      persistDraft()
      void router.push(loginHref)
      return
    }
    setTransportRequestError(null)
    const pts = arrivalPointTypes
    setTransportArrivalPoint(pts[0] ?? "harbour")
    setTransportArrivalDate(checkIn || "")
    setTransportReturnDate("")
    setTransportReqPersons(
      String(Math.min(Math.max(guests, 1), cabin.max_guests)),
    )
    setTransportMessage("")
    setTransportRequestExpanded(true)
  }

  function onSubmitTransportRequest(e: React.FormEvent) {
    e.preventDefault()
    setTransportRequestError(null)
    if (!checkIn) {
      setTransportRequestError(t("booking_transport_request_need_checkin"))
      return
    }
    const ad = transportArrivalDate.trim()
    if (!ad || ad < checkIn) {
      setTransportRequestError(t("booking_transport_request_bad_arrival_date"))
      return
    }
    const rd = transportReturnDate.trim()
    if (rd) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(rd) || rd < ad) {
        setTransportRequestError(
          "Returdato kan ikke være før ankomstdato.",
        )
        return
      }
    }
    const num = Math.floor(Number(transportReqPersons))
    if (num < 1 || num > cabin.max_guests) {
      setTransportRequestError(t("booking_transport_request_bad_persons"))
      return
    }
    if (!arrivalPointTypes.includes(transportArrivalPoint)) {
      setTransportRequestError(tCommon("error"))
      return
    }
    startTransport(async () => {
      const r = await createCabinTransportRequest({
        cabin_id: cabin.id,
        check_in: checkIn,
        arrival_date: ad,
        ...(rd ? { return_date: rd } : {}),
        arrival_point: transportArrivalPoint,
        num_persons: num,
        message: transportMessage.trim() || null,
      })
      if ("error" in r && r.error) {
        setTransportRequestError(r.error)
        return
      }
      setTransportRequestSuccess(true)
      setTransportRequestExpanded(false)
    })
  }

  return (
    <div
      id="cabin-booking"
      className="w-full"
      style={{ fontFamily: "var(--font-jakarta, system-ui)" }}
    >
      <h2 className="text-lg sm:text-xl font-bold text-foreground mb-1">
        {cabin.property_type === "residence" ? t("booking_title_residence") : t("booking_title")}
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        {t("booking_subtitle")}
      </p>
      <div className="bg-white dark:bg-card rounded-2xl border border-border shadow-card p-4 sm:p-5">
        <div className="space-y-4">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
              {t("booking_dates_label")}
            </span>
            <div className="flex justify-center py-1 rounded-xl border border-border/80 bg-muted/20">
              <CalendarDropdown
                mode="range"
                today={todayYmd}
                checkIn={checkIn}
                checkOut={checkOut}
                singleDate=""
                onRangeChange={(ci, co) => {
                  if (!ci) {
                    setRange(undefined)
                    return
                  }
                  setRange({
                    from: parseYmdLocal(ci),
                    to: co ? parseYmdLocal(co) : undefined,
                  })
                }}
                onSingleChange={() => {}}
                isUnavailable={isUnavailableDay}
                showSingleMonth
                className="w-full max-w-md border-0 bg-transparent p-1 shadow-none md:p-2"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {t("booking_dates_hint")}
            </p>
            {minNights > 1 && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
                {t("booking_min_nights_warning", { count: minNights })}
                {nights > 0 && nights < minNights
                  ? ` ${t("booking_min_nights_selected", { count: nights })}`
                  : ""}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="cabin_guests"
              className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block"
            >
              {tCommon("guests")}
            </label>
            <Input
              id="cabin_guests"
              type="number"
              min={1}
              value={guestsInput}
              onChange={(e) => setGuestsInput(e.target.value)}
              className={cn(
                "rounded-xl h-11 w-full sm:max-w-[12rem]",
                guestError && "border-destructive",
              )}
              aria-invalid={!!guestError}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t("booking_max_guests_label", { count: cabin.max_guests })}
            </p>
            {guestError && (
              <p className="text-xs text-destructive mt-1">{guestError}</p>
            )}
          </div>

          {hasAcceptedTransportOffer && acceptedTransportOffer ? (
            <div className="rounded-xl border border-[#114788]/25 bg-[#114788]/08 p-4 space-y-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                {t("booking_transport_included_title")}
              </span>
              <p className="text-sm font-semibold text-foreground tabular-nums">
                {fmtOreKrLine(acceptedOfferOre)}
              </p>
              {acceptedTransportOffer.message != null &&
                acceptedTransportOffer.message.trim() !== "" && (
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap border-t border-border/60 pt-2 mt-1">
                    {acceptedTransportOffer.message.trim()}
                  </p>
                )}
            </div>
          ) : null}

          {transferRoutes.length > 0 && (
            <div className="space-y-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Tilføj transfer?
              </span>
              <div className="space-y-2" role="radiogroup" aria-label="Transfervalg">
                <button
                  type="button"
                  role="radio"
                  aria-checked={selectedTransferRouteId === null}
                  onClick={() => setSelectedTransferRouteId(null)}
                  className={cn(
                    "w-full text-left rounded-xl border px-3 py-2.5 text-sm transition-colors",
                    selectedTransferRouteId === null
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border hover:border-primary/50",
                  )}
                >
                  Ingen transfer
                </button>
                {transferRoutes.map((r) => {
                  const rid = r.id
                  if (!rid) return null
                  const sel = selectedTransferRouteId === rid
                  return (
                    <button
                      key={rid}
                      type="button"
                      role="radio"
                      aria-checked={sel}
                      onClick={() => setSelectedTransferRouteId(rid)}
                      className={cn(
                        "w-full text-left rounded-xl border px-3 py-2.5 text-sm transition-colors",
                        sel
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border hover:border-primary/50",
                      )}
                    >
                      <span className="flex items-start gap-2">
                        <span className="shrink-0" aria-hidden>
                          {routeTransportIcon(r.transport_type)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="font-medium text-foreground block">
                            {r.from_arrival_point}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {fmtOreKrLine(r.price_one_way_ore)} enkelttur ·{" "}
                            {fmtOreKrLine(r.price_roundtrip_ore)} tur/retur
                          </span>
                          <span className="text-xs text-muted-foreground block mt-0.5">
                            Op til {r.max_guests} gæster
                          </span>
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
              {selectedTransferRouteId && (
                <div className="space-y-2 pt-1">
                  <div className="flex flex-col sm:flex-row gap-2 w-full">
                    <Button
                      type="button"
                      variant={!transferIsRoundtrip ? "default" : "outline"}
                      className="flex-1 rounded-xl"
                      onClick={() => setTransferIsRoundtrip(false)}
                    >
                      Enkelttur
                    </Button>
                    <Button
                      type="button"
                      variant={transferIsRoundtrip ? "default" : "outline"}
                      className="flex-1 rounded-xl"
                      onClick={() => setTransferIsRoundtrip(true)}
                    >
                      Tur/retur
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Tidspunkt aftales i chatten. Refunderes ved force majeure.
                  </p>
                </div>
              )}
              {transferGuestsInvalid && (
                <p className="text-xs text-destructive">
                  Denne transfer kan højst bookes med {selectedTransferRoute?.max_guests}{" "}
                  gæster.
                </p>
              )}
            </div>
          )}

          {transferRoutes.length === 0 &&
            cabin.offers_transport &&
            perPerson > 0 &&
            !hasAcceptedTransportOffer && (
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                {t("booking_transport_label")}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTransport("none")}
                  className={cn(
                    "text-left rounded-lg px-3 py-2.5 text-sm border transition-colors",
                    transport === "none"
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border hover:border-primary/50",
                  )}
                >
                  {t("booking_trip_none")}
                </button>
                {TRIP_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setTransport(o.value)}
                    className={cn(
                      "text-left rounded-lg px-3 py-2.5 text-sm border transition-colors",
                      transport === o.value
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border hover:border-primary/50",
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {t("booking_transport_hint", { price: formatPrice(calcDisplayPrice(perPerson)) })}
              </p>
            </div>
          )}
        </div>

        {nights > 0 && cabinTotalOre > 0 && (
          <div className="mt-4 rounded-xl bg-muted p-4 text-sm space-y-1.5">
            <div className="flex justify-between gap-2 text-muted-foreground">
              <span>
                Ophold ({nights} {nights === 1 ? "nat" : "nætter"})
              </span>
              <span className="font-medium text-foreground tabular-nums shrink-0">
                {fmtOreKrLine(cabinTotalOre)}
              </span>
            </div>
            {transportAddonOre > 0 && (
              <div className="flex justify-between gap-2 text-muted-foreground">
                <span className="min-w-0">
                  {transferRoutes.length > 0 && selectedTransferRoute ? (
                    <>Transfer (fra {selectedTransferRoute.from_arrival_point})</>
                  ) : hasAcceptedTransportOffer ? (
                    t("booking_transport_included_title")
                  ) : (
                    t("booking_transport_addon")
                  )}
                </span>
                <span className="font-medium text-foreground tabular-nums shrink-0">
                  {fmtOreKrLine(transportAddonOre)}
                </span>
              </div>
            )}
            <div className="my-2 border-t border-border" aria-hidden />
            <div className="flex justify-between font-bold text-foreground pt-1.5">
              <span>{t("booking_grand_total")}</span>
              <span className="tabular-nums">{fmtOreKrLine(guestTotalOre)}</span>
            </div>
          </div>
        )}

        {enableCabinTransportRequest &&
          transferRoutes.length === 0 &&
          !hasAcceptedTransportOffer && (
          <div className="mt-5 pt-4 border-t border-border/80 space-y-3">
            {transportRequestSuccess ? (
              <p
                role="status"
                className="text-sm leading-relaxed rounded-xl border border-[#114788]/25 bg-[#114788]/08 text-foreground px-4 py-3"
              >
                {t("booking_transport_request_success")}
              </p>
            ) : !transportRequestExpanded ? (
              <>
                {hasOpenTransportRequest && !transportRequestSuccess && (
                  <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    Du har en åben transportanmodning. Vi anbefaler at vente til transport er bekræftet.
                  </p>
                )}
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full rounded-xl border-[#114788] text-[#114788] bg-transparent hover:bg-[#114788]/10 font-semibold"
                  onClick={openTransportRequestFlow}
                >
                  {t("booking_transport_request_cta")}
                </Button>
              </>
            ) : (
              <form
                className="space-y-3 rounded-xl border border-border p-3 sm:p-4 bg-muted/10"
                onSubmit={onSubmitTransportRequest}
              >
                {!checkIn && (
                  <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    {t("booking_transport_request_need_checkin")}
                  </p>
                )}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="cabin_transport_arrival"
                    className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                  >
                    {t("booking_transport_request_arrival_label")}
                  </Label>
                  <select
                    id="cabin_transport_arrival"
                    value={transportArrivalPoint}
                    onChange={(e) =>
                      setTransportArrivalPoint(e.target.value as ArrivalPoint)
                    }
                    className={cn(
                      "flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#114788]/40 focus-visible:ring-offset-2",
                    )}
                  >
                    {arrivalSelectOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="cabin_transport_arrival_date"
                    className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                  >
                    {t("booking_transport_request_date_label")}
                  </Label>
                  <Input
                    id="cabin_transport_arrival_date"
                    type="date"
                    required
                    min={checkIn || undefined}
                    value={transportArrivalDate}
                    onChange={(e) => setTransportArrivalDate(e.target.value)}
                    className="rounded-xl h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="cabin_transport_return_date"
                    className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                  >
                    Returdato (valgfrit)
                  </Label>
                  <Input
                    id="cabin_transport_return_date"
                    type="date"
                    min={
                      transportArrivalDate.trim() || checkIn || undefined
                    }
                    value={transportReturnDate}
                    onChange={(e) => setTransportReturnDate(e.target.value)}
                    className="rounded-xl h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="cabin_transport_persons"
                    className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                  >
                    {t("booking_transport_request_persons_label")}
                  </Label>
                  <Input
                    id="cabin_transport_persons"
                    type="number"
                    min={1}
                    max={cabin.max_guests}
                    value={transportReqPersons}
                    onChange={(e) => setTransportReqPersons(e.target.value)}
                    className="rounded-xl h-11 w-full sm:max-w-[12rem]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="cabin_transport_message"
                    className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                  >
                    {t("booking_transport_request_message_label")}
                  </Label>
                  <Textarea
                    id="cabin_transport_message"
                    maxLength={500}
                    value={transportMessage}
                    onChange={(e) => setTransportMessage(e.target.value)}
                    rows={3}
                    className="rounded-xl resize-y min-h-[88px] text-sm focus-visible:ring-[#114788]/40"
                  />
                  <p className="text-[11px] text-muted-foreground text-right tabular-nums">
                    {transportMessage.length}/500
                  </p>
                </div>
                {transportRequestError && (
                  <p className="text-xs text-destructive" role="alert">
                    {transportRequestError}
                  </p>
                )}
                <Button
                  type="submit"
                  disabled={transportPending || !checkIn}
                  className="h-11 w-full rounded-xl bg-[#114788] hover:bg-[#0d3566] text-white font-semibold"
                >
                  {transportPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin inline" />
                      {t("booking_transport_request_submitting")}
                    </>
                  ) : (
                    t("booking_transport_request_submit")
                  )}
                </Button>
              </form>
            )}
          </div>
        )}

        <div className="mt-5">
          {isLoggedIn ? (
            <Button
              type="button"
              onClick={onBook}
              disabled={bookDisabled}
              className="h-12 w-full rounded-xl font-semibold"
            >
              {pending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin inline" />
                  {t("booking_redirecting")}
                </>
              ) : nights > 0 && !guestInvalid ? (
                `${t("booking_book_now")}${subtotalOre > 0 ? " — " + formatPrice(guestTotalOre) : ""}`
              ) : (
                t("booking_select_dates_guests")
              )}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={onBook}
              disabled={bookDisabled}
              className="h-12 w-full rounded-xl font-semibold"
            >
              {t("booking_login_book")}
            </Button>
          )}
        </div>

        <p className="text-xs text-center text-muted-foreground mt-3">
          {isLoggedIn ? (
            t("booking_secure")
          ) : (
            <>
              {t("booking_has_account")}{" "}
              <Link
                href={loginHref}
                className="text-primary font-medium hover:underline"
                onClick={() => {
                  if (checkIn && checkOut) persistDraft()
                }}
              >
                {t("booking_login")}
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
