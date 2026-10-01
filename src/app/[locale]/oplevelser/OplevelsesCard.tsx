"use client"

import { useState } from "react"
import { Link } from "@/i18n/navigation"
import { MapPin, ChevronLeft, ChevronRight, Ticket } from "lucide-react"
import { calcDisplayPrice, formatKr } from "@/lib/money"
import { getLocationName } from "@/lib/greenlandLocations"
import { EXPERIENCE_CATEGORIES } from "@/lib/experienceCategories"
import { captureEvent } from "@/lib/analytics/posthog-events"

export type OplevelseCardData = {
  id: string
  title: string
  location_hub: string
  images: string[]
  categories: { key: string }[]
  price_per_person_ore: number
  duration_minutes: number | null
}

function categoryLabel(key: string): string {
  const hit = EXPERIENCE_CATEGORIES.find((c) => c.key === key)
  return hit?.label ?? key
}

function isValidUrl(url: string): boolean {
  try {
    return url.startsWith("https://") || url.startsWith("http://")
  } catch {
    return false
  }
}

function durationHoursLabel(minutes: number | null, locale: string): string | null {
  if (minutes == null || minutes <= 0) return null
  const h = Math.round((minutes / 60) * 10) / 10
  if (locale === "en") {
    return `approx. ${h} ${h === 1 ? "hour" : "hours"}`
  }
  return `ca. ${h.toLocaleString("da-DK", { minimumFractionDigits: h % 1 === 0 ? 0 : 1, maximumFractionDigits: 1 })} timer`
}

export default function OplevelsesCard({
  row,
  resultIndex = 0,
  locale,
}: {
  row: OplevelseCardData
  resultIndex?: number
  locale: string
}) {
  const images = (row.images ?? []).filter(isValidUrl)
  const hasImages = images.length > 0
  const [idx, setIdx] = useState(0)
  const [imgError, setImgError] = useState(false)

  const chipKeys = (row.categories ?? []).map((c) => c.key).filter(Boolean)
  const showKeys = chipKeys.slice(0, 2)
  const rest = chipKeys.length - showKeys.length

  const guestOre = calcDisplayPrice(row.price_per_person_ore)
  const priceShown = formatKr(guestOre)

  const durationTxt = durationHoursLabel(row.duration_minutes, locale)

  const href = `/oplevelser/${row.id}`

  function prev(e: React.MouseEvent) {
    e.preventDefault()
    setIdx((i) => (i === 0 ? images.length - 1 : i - 1))
    setImgError(false)
  }
  function next(e: React.MouseEvent) {
    e.preventDefault()
    setIdx((i) => (i === images.length - 1 ? 0 : i + 1))
    setImgError(false)
  }

  const fraLabel = locale === "en" ? "From" : "Fra"
  const perParticipant = locale === "en" ? "participant" : "deltager"

  return (
    <Link
      href={href}
      className="group block"
      onClick={() =>
        captureEvent("search_result_clicked", {
          type: "experience",
          listing_id: row.id,
          position_in_results: resultIndex,
        })
      }
    >
      <div className="relative overflow-hidden rounded-2xl aspect-[4/3] mb-3 bg-gradient-to-br from-primary/20 to-accent/20">
        {hasImages && !imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={images[idx]}
            alt={row.title}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-primary/40">
            <Ticket size={36} strokeWidth={1.5} />
          </div>
        )}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full transition-colors z-10"
              aria-label={locale === "en" ? "Previous image" : "Forrige billede"}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full transition-colors z-10"
              aria-label={locale === "en" ? "Next image" : "Næste billede"}
            >
              <ChevronRight size={16} />
            </button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
              {images.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === idx ? "bg-white w-4" : "bg-white/50 w-1.5"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div>
        <h3 className="font-semibold text-foreground text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2 mb-1">
          {row.title}
        </h3>

        <div className="flex flex-wrap gap-1.5 mb-2">
          {showKeys.map((k) => (
            <span
              key={k}
              className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-[11px] font-medium text-foreground border border-border/80"
            >
              {categoryLabel(k)}
            </span>
          ))}
          {rest > 0 ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-[11px] font-medium text-muted-foreground border border-border/80">
              +{rest} {locale === "en" ? "more" : "mere"}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-1 text-muted-foreground text-xs mb-1.5">
          <MapPin size={11} className="shrink-0" />
          <span className="line-clamp-1">{getLocationName(row.location_hub)}</span>
        </div>

        <p className="text-sm font-semibold text-foreground tabular-nums">
          {fraLabel} {priceShown}
          <span className="font-normal text-muted-foreground text-xs"> / {perParticipant}</span>
        </p>

        {durationTxt ? (
          <p className="text-xs text-muted-foreground mt-1">{durationTxt}</p>
        ) : null}
      </div>
    </Link>
  )
}
