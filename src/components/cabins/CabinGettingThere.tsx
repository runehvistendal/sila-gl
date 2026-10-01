"use client"

import { useMemo, useState } from "react"
import { Anchor, ArrowRight, Car, Check, CloudSun, Compass, MessageSquare, Ship } from "lucide-react"
import { useFormatter, useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import { useFormatPrice } from "@/hooks/useFormatPrice"
import { calcDisplayPrice } from "@/lib/money"
import { getLocationName } from "@/lib/greenlandLocations"
import { nuukDateYmd } from "@/lib/nuukTime"
import TransportDrawer from "@/components/transport/TransportDrawer"
import type { TransferRoute } from "@/types/transfer"

const NUUK_TZ = "America/Godthab"

export interface GettingThereRideShare {
  id: string
  from_location: string
  to_location: string
  departure_at: string
  seats_available: number
  price_per_seat_ore: number
  profiles: { full_name: string | null } | null
}

interface Props {
  /** Lowercase lokationsnøgle (cabins.location_hub) */
  locationHub: string
  /** true for hytter i naturen — typisk kun adgang med båd */
  boatAccess: boolean
  transferRoutes: TransferRoute[]
  /** Ældre model: fast pris pr. person pr. strækning, vælges i bookingboksen */
  legacyHostTransportOre: number | null
  /** Kommende sejladser til OG fra lokationen */
  rideShares: GettingThereRideShare[]
  checkIn: string
  checkOut: string
  guests: number
  /** Gæsten kan efterspørge transport (ingen faste transferruter) */
  canRequest: boolean
  hasOpenRequest: boolean
  hasAcceptedOffer: boolean
  onRequestTransport: () => void
}

function shiftYmd(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function OptionCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4 sm:p-5">
      <h3 className="flex items-center gap-2.5 text-base font-bold text-foreground mb-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#114788]/10 text-[#114788] shrink-0">
          {icon}
        </span>
        {title}
      </h3>
      {children}
    </div>
  )
}

export default function CabinGettingThere({
  locationHub,
  boatAccess,
  transferRoutes,
  legacyHostTransportOre,
  rideShares,
  checkIn,
  checkOut,
  guests,
  canRequest,
  hasOpenRequest,
  hasAcceptedOffer,
  onRequestTransport,
}: Props) {
  const t = useTranslations("cabins")
  const fmt = useFormatter()
  const formatPrice = useFormatPrice()
  const [drawerId, setDrawerId] = useState<string | null>(null)

  const place = getLocationName(locationHub)
  const hubKey = locationHub.toLowerCase()

  const { outbound, inbound } = useMemo(() => {
    const outMatch = checkIn ? new Set([shiftYmd(checkIn, -1), checkIn]) : null
    const inMatch = checkOut ? new Set([checkOut, shiftYmd(checkOut, 1)]) : null

    const decorate = (rows: GettingThereRideShare[], match: Set<string> | null) =>
      rows
        .map((r) => ({ ...r, fits: match ? match.has(nuukDateYmd(r.departure_at)) : false }))
        // Passende datoer først, derefter kronologisk
        .sort((a, b) => Number(b.fits) - Number(a.fits) || a.departure_at.localeCompare(b.departure_at))
        .slice(0, 3)

    return {
      outbound: decorate(
        rideShares.filter((r) => r.to_location.toLowerCase() === hubKey),
        outMatch,
      ),
      inbound: decorate(
        rideShares.filter((r) => r.from_location.toLowerCase() === hubKey),
        inMatch,
      ),
    }
  }, [rideShares, hubKey, checkIn, checkOut])

  const hasRideShares = outbound.length > 0 || inbound.length > 0
  const hasHostTransfer = transferRoutes.length > 0 || (legacyHostTransportOre ?? 0) > 0
  const datesChosen = Boolean(checkIn && checkOut)

  const whenLabel = (iso: string) =>
    `${fmt.dateTime(new Date(iso), { timeZone: NUUK_TZ, weekday: "short", day: "numeric", month: "short" })} · ${fmt.dateTime(
      new Date(iso),
      { timeZone: NUUK_TZ, hour: "2-digit", minute: "2-digit" },
    )}`

  const tripList = (rows: (GettingThereRideShare & { fits: boolean })[], label: string) =>
    rows.length === 0 ? null : (
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{label}</p>
        <ul className="space-y-2">
          {rows.map((r) => {
            const soldOut = r.seats_available <= 0
            const tooFew = !soldOut && r.seats_available < guests
            return (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setDrawerId(r.id)}
                  disabled={soldOut}
                  className="w-full text-left rounded-xl border border-border p-3 flex items-center justify-between gap-3 hover:border-[#114788] transition-colors disabled:opacity-60 disabled:hover:border-border"
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground flex-wrap">
                      {getLocationName(r.from_location)}
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-hidden />
                      {getLocationName(r.to_location)}
                    </span>
                    <span className="block text-xs text-muted-foreground mt-0.5 first-letter:uppercase">
                      {whenLabel(r.departure_at)}
                      {" · "}
                      {soldOut
                        ? t("gt_trip_sold_out")
                        : tooFew
                          ? t("gt_trip_too_few", { count: r.seats_available })
                          : t("transport_seats_left", { count: r.seats_available })}
                    </span>
                    {r.fits && (
                      <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-green-100 text-green-800 text-[11px] font-semibold px-2 py-0.5">
                        <Check className="w-3 h-3" aria-hidden />
                        {t("gt_trip_fits")}
                      </span>
                    )}
                  </span>
                  <span className="text-right shrink-0">
                    <span className="block text-sm font-bold text-foreground tabular-nums">
                      {formatPrice(calcDisplayPrice(r.price_per_seat_ore))}
                    </span>
                    <span className="block text-xs text-muted-foreground">{t("gt_per_seat")}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    )

  return (
    <section aria-labelledby="getting-there-title">
      <h2 id="getting-there-title" className="text-xl font-bold text-foreground mb-1">
        {t("gt_title")}
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        {boatAccess ? t("gt_intro_boat", { place }) : t("gt_intro_town", { place })}
      </p>

      <div className="space-y-3">
        {/* ── 1. Værtens transfer ── */}
        {hasHostTransfer && (
          <OptionCard icon={<Anchor className="w-4 h-4" />} title={t("gt_host_title")}>
            {transferRoutes.length > 0 ? (
              <ul className="divide-y divide-border">
                {transferRoutes.map((r, i) => (
                  <li key={r.id ?? i} className="py-3 first:pt-1 last:pb-1">
                    <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      {r.transport_type === "boat" ? (
                        <Ship className="w-4 h-4 text-[#114788]" aria-hidden />
                      ) : (
                        <Car className="w-4 h-4 text-[#114788]" aria-hidden />
                      )}
                      {t("gt_host_from", { place: r.from_arrival_point })}
                    </p>
                    <p className="text-sm text-foreground mt-1">
                      {t("gt_host_prices", {
                        oneWay: formatPrice(calcDisplayPrice(r.price_one_way_ore)),
                        roundTrip: formatPrice(calcDisplayPrice(r.price_roundtrip_ore)),
                      })}
                      <span className="text-muted-foreground"> · {t("gt_host_max_guests", { count: r.max_guests })}</span>
                    </p>
                    {r.description?.trim() ? (
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed whitespace-pre-line break-words">
                        {r.description.trim()}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-foreground">
                {t("gt_host_legacy", { price: formatPrice(calcDisplayPrice(legacyHostTransportOre ?? 0)) })}
              </p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">{t("gt_host_how")}</p>
          </OptionCard>
        )}

        {/* ── 2. Samsejlads ── */}
        {(boatAccess || hasRideShares) && (
          <OptionCard icon={<Ship className="w-4 h-4" />} title={t("gt_rideshare_title")}>
            {hasRideShares ? (
              <div className="space-y-4">
                {!datesChosen && <p className="text-xs text-muted-foreground">{t("gt_rideshare_pick_dates")}</p>}
                {tripList(outbound, t("gt_rideshare_out", { place }))}
                {tripList(inbound, t("gt_rideshare_home", { place }))}
                <p className="text-xs text-muted-foreground">{t("gt_rideshare_note")}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("gt_rideshare_none", { place })}</p>
            )}
          </OptionCard>
        )}

        {/* ── 3. Efterspørg transport ── */}
        {canRequest && (
          <OptionCard icon={<MessageSquare className="w-4 h-4" />} title={t("gt_request_title")}>
            <p className="text-sm text-muted-foreground mb-3">{t("gt_request_body")}</p>
            {hasOpenRequest ? (
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 text-sm text-amber-900">
                {t("gt_request_open")}{" "}
                <Link href="/dashboard?tab=mine-oensker" className="font-semibold underline">
                  {t("gt_request_open_link")}
                </Link>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={onRequestTransport}
                className="h-11 w-full sm:w-auto rounded-xl border-[#114788] text-[#114788] hover:bg-[#114788]/10 font-semibold"
              >
                {t("gt_request_cta")}
              </Button>
            )}
          </OptionCard>
        )}

        {hasAcceptedOffer && (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-900 flex gap-2.5">
            <Check className="w-4 h-4 mt-0.5 shrink-0" aria-hidden />
            {t("gt_accepted_offer")}
          </div>
        )}

        {/* ── 4. Egen transport ── */}
        {boatAccess && (
          <OptionCard icon={<Compass className="w-4 h-4" />} title={t("gt_own_title")}>
            <p className="text-sm text-muted-foreground">{t("gt_own_body")}</p>
          </OptionCard>
        )}

        {/* ── Vejr ── */}
        {boatAccess && (
          <div className="flex gap-3 rounded-2xl bg-muted p-4">
            <CloudSun className="w-5 h-5 text-[#114788] shrink-0 mt-0.5" aria-hidden />
            <div className="text-sm">
              <p className="font-semibold text-foreground">{t("gt_weather_title")}</p>
              <p className="text-muted-foreground mt-0.5 leading-relaxed">{t("gt_weather_body")}</p>
            </div>
          </div>
        )}
      </div>

      <TransportDrawer id={drawerId} seats={Math.max(1, guests)} onClose={() => setDrawerId(null)} />
    </section>
  )
}
