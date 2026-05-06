"use client"

import { FormEvent, useState } from "react"
import { motion } from "framer-motion"
import { useTranslations } from "next-intl"
import { useRouter } from "@/i18n/navigation"
import LocationAutocomplete from "@/components/shared/LocationAutocomplete"
import { GREENLAND_LOCATIONS } from "@/lib/greenlandLocations"
import type { GreenlandLocation } from "@/lib/greenlandLocations"

const majorHubs = GREENLAND_LOCATIONS.filter((l) => l.is_major_hub)

export default function HeroContent() {
  const t = useTranslations("home")
  const router = useRouter()
  const [hub, setHub] = useState("")

  function goToLocation(loc: GreenlandLocation) {
    router.push(`/hytter?hub=${encodeURIComponent(loc.name_dk)}`)
  }

  function submitSearch(e?: FormEvent) {
    e?.preventDefault()
    const trimmed = hub.trim()
    if (!trimmed) {
      router.push("/hytter")
      return
    }
    router.push(`/hytter?hub=${encodeURIComponent(trimmed)}`)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-20 pb-16 md:pt-28 md:pb-24">
      {/* Badge */}
      <motion.div
        className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 mb-6 text-sm font-medium"
        style={{
          backgroundColor: "rgba(255,255,255,0.12)",
          border: "1px solid rgba(255,255,255,0.18)",
          color: "rgba(255,255,255,0.9)",
        }}
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
        {t("badge")}
      </motion.div>

      {/* Headline */}
      <motion.h1
        className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight mb-4 max-w-2xl"
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, delay: 0.1 }}
      >
        {t("headline")}
      </motion.h1>

      <motion.p
        className="text-lg md:text-xl text-white/80 mb-8 max-w-md leading-relaxed"
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, delay: 0.2 }}
      >
        {t("subheadline")}
      </motion.p>

      {/* Søgefelt + separat Søg-knap */}
      <motion.div
        className="relative w-full md:max-w-[480px]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.35 }}
      >
        <form className="flex items-center gap-2" onSubmit={submitSearch}>
          <LocationAutocomplete
            variant="hero"
            className="flex-1 min-w-0"
            value={hub}
            onChange={setHub}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
          />
          <button
            type="submit"
            className="px-5 py-4 md:py-3.5 rounded-2xl text-sm font-semibold text-primary-foreground bg-primary shrink-0 hover:bg-primary/90 transition-colors shadow-2xl whitespace-nowrap"
          >
            {t("searchButton")}
          </button>
        </form>
      </motion.div>

      <motion.div
        className="flex flex-wrap gap-2 mt-6 w-full md:max-w-[480px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        {majorHubs.map((loc) => (
          <button
            key={`${loc.postal_code}-${loc.name_dk}`}
            type="button"
            onClick={() => goToLocation(loc)}
            className="text-xs px-3 py-2 rounded-full transition-all hover:bg-white/20 active:scale-95"
            style={{
              backgroundColor: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "rgba(255,255,255,0.85)",
            }}
          >
            {loc.name_dk}
          </button>
        ))}
      </motion.div>
    </div>
  )
}
