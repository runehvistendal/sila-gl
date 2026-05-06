"use client"

import { useMemo, useState } from "react"
import dynamic from "next/dynamic"
import { Anchor, Users, ArrowRight, Home as HomeLucide, MapPin } from "lucide-react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"
import type { TransportMapRoute } from "@/components/map/TransportMap"
import { cabinPinsToMapRoutes, type CabinMapPin } from "@/lib/cabinMapRoutes"
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
const FEATURE_ICONS_CABIN = [HomeLucide, MapPin] as const

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

type Tab = "transport" | "cabins"

interface Props {
  rideShares: HomeRideShareMapRow[]
  cabinPins: CabinMapPin[]
}

export default function SailSection({ rideShares, cabinPins }: Props) {
  const t = useTranslations("home")
  const [tab, setTab] = useState<Tab>("transport")

  const transportRoutes = useMemo(() => rideRowsToRoutes(rideShares), [rideShares])
  const cabinRoutes = useMemo(() => cabinPinsToMapRoutes(cabinPins), [cabinPins])

  const mapRoutes = tab === "transport" ? transportRoutes : cabinRoutes

  const transportFeatures = useMemo(
    () =>
      ([0, 1] as const).map((i) => ({
        label: t(`sailSection.features.${i}.label`),
        desc: t(`sailSection.features.${i}.desc`),
      })),
    [t],
  )

  const cabinFeatures = useMemo(
    () =>
      ([0, 1] as const).map((i) => ({
        label: t(`cabinMapSection.features.${i}.label`),
        desc: t(`cabinMapSection.features.${i}.desc`),
      })),
    [t],
  )

  return (
    <section className="py-20 bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
        <div className="flex justify-center md:justify-start">
          <div
            role="tablist"
            aria-label={t("sailMapTabs.aria")}
            className="inline-flex rounded-full border border-border bg-muted/40 p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab === "transport"}
              onClick={() => setTab("transport")}
              className={cn(
                "rounded-full px-5 py-2 text-sm font-semibold transition-colors",
                tab === "transport"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t("sailMapTabs.samsejlads")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "cabins"}
              onClick={() => setTab("cabins")}
              className={cn(
                "rounded-full px-5 py-2 text-sm font-semibold transition-colors",
                tab === "cabins"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t("sailMapTabs.hytter")}
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            {tab === "transport" ? (
              <>
                <div className="inline-flex items-center gap-2 text-primary/70 text-xs font-bold tracking-widest uppercase mb-5">
                  <Anchor size={14} /> {t("sailSection.uniqueLabel")}
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 leading-tight">
                  {t("sailSection.title")}{" "}
                  <em className="font-normal text-primary">{t("sailSection.titleHighlight")}</em>
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
              </>
            ) : (
              <>
                <div className="inline-flex items-center gap-2 text-primary/70 text-xs font-bold tracking-widest uppercase mb-5">
                  <HomeLucide size={14} /> {t("cabinMapSection.badge")}
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 leading-tight">
                  {t("cabinMapSection.title")}
                </h2>
                <p className="text-muted-foreground text-lg leading-relaxed mb-8">{t("cabinMapSection.desc")}</p>
                <div className="flex flex-col gap-3 mb-8">
                  {cabinFeatures.map((f, i) => {
                    const Icon = FEATURE_ICONS_CABIN[i]
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
                  href="/hytter"
                  className="inline-flex items-center gap-2 px-8 py-3 rounded-full text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  {t("cabinMapSection.seeAll")} <ArrowRight size={15} />
                </Link>
              </>
            )}
          </div>

          <div className="relative rounded-2xl overflow-hidden h-80 lg:h-96 shadow-card-hover">
            <TransportMap
              key={tab}
              mode="overview"
              routes={mapRoutes}
              className="h-full min-h-[20rem] border-0 rounded-2xl"
              analyticsType={tab === "cabins" ? "cabin" : "transport"}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
