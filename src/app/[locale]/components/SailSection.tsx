"use client"

import { useMemo } from "react"
import dynamic from "next/dynamic"
import { Anchor, Users, ArrowRight } from "lucide-react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import type { TransportMapRoute } from "@/components/map/TransportMap"
import { getLocationName } from "@/lib/greenlandLocations"

export type HomeRideShareMapRow = {
  id: string
  from_location: string
  to_location: string
  from_latitude: number | null
  from_longitude: number | null
  to_latitude: number | null
  to_longitude: number | null
  departure_at: string | null
  seats_available: number | null
  price_per_seat_ore: number | null
  profiles?:
    | { full_name: string | null }
    | { full_name: string | null }[]
    | null
}

const TransportMap = dynamic(() => import("@/components/map/TransportMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full min-h-[20rem] rounded-2xl border border-border bg-muted flex items-center justify-center">
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        Indlæser kort…
      </div>
    </div>
  ),
})

const FEATURE_ICONS_SAM = [Users, Anchor] as const

function rideRowsToRoutes(rows: HomeRideShareMapRow[]): TransportMapRoute[] {
  return rows
    .filter(
      (r) =>
        r.from_latitude != null &&
        r.from_longitude != null &&
        r.to_latitude != null &&
        r.to_longitude != null,
    )
    .map((r) => ({
      id: r.id,
      fromName: getLocationName(r.from_location),
      fromLat: Number(r.from_latitude),
      fromLng: Number(r.from_longitude),
      toName: getLocationName(r.to_location),
      toLat: Number(r.to_latitude),
      toLng: Number(r.to_longitude),
      meta: {
        departure: r.departure_at ?? undefined,
        seatsAvailable: r.seats_available ?? undefined,
        priceOre: r.price_per_seat_ore ?? undefined,
        skipperName: (() => {
          const p = r.profiles
          if (Array.isArray(p)) return p[0]?.full_name ?? "Sila-sejler"
          return p?.full_name ?? "Sila-sejler"
        })(),
      },
    }))
}

interface Props {
  rideShares: HomeRideShareMapRow[]
}

export default function SailSection({ rideShares }: Props) {
  const t = useTranslations("home")

  const transportRoutes = useMemo(() => rideRowsToRoutes(rideShares), [rideShares])

  const transportFeatures = useMemo(
    () =>
      ([0, 1] as const).map((i) => ({
        label: t(`sailSection.features.${i}.label`),
        desc: t(`sailSection.features.${i}.desc`),
      })),
    [t],
  )

  const transportHeadLead = useMemo(
    () => t("sailSection.title").replace(/\s*[—–-]\s*$/, "").trim(),
    [t],
  )

  return (
    <section className="py-20 bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 text-primary/70 text-xs font-bold tracking-widest uppercase mb-5">
              <Anchor size={14} /> {t("sailSection.uniqueLabel")}
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 leading-tight">
              <span className="text-foreground">{transportHeadLead}</span>
              <em className="font-normal italic text-primary">
                {" "}
                — {t("sailSection.titleHighlight")}
              </em>
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-8">{t("sailSection.desc")}</p>
            <div className="flex flex-col gap-3 mb-8">
              {transportFeatures.map((f, i) => {
                const Icon = FEATURE_ICONS_SAM[i]
                return (
                  <div
                    key={f.label}
                    className="flex items-center gap-4 rounded-2xl p-4 bg-card shadow-card border border-border"
                  >
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                      <Icon size={18} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{f.label}</p>
                      <p className="text-xs text-muted-foreground">{f.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>
            <Link
              href="/transport"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-full text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              {t("sailSection.findBoat")} <ArrowRight size={15} />
            </Link>
          </div>

          <div className="relative rounded-2xl overflow-hidden h-80 lg:h-96 shadow-card-hover">
            <TransportMap
              mode="overview"
              routes={transportRoutes}
              className="h-full min-h-[20rem] border-0 rounded-2xl"
              analyticsType="transport"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
