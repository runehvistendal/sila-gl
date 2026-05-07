"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { useTranslations } from "next-intl"
import { GREENLAND_LOCATIONS } from "@/lib/greenlandLocations"
import { cn } from "@/lib/utils"
import HeroSearchBar from "./HeroSearchBar"

const majorHubs = GREENLAND_LOCATIONS.filter((l) => l.is_major_hub)

type HeroTab = "cabins" | "transport"

export default function HeroContent() {
  const t = useTranslations("home")
  const [tab, setTab] = useState<HeroTab>("cabins")

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

      {/* Tabs + Airbnb-pille søgebaren */}
      <motion.div
        className="w-full max-w-[860px]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.35 }}
      >
        <div
          role="tablist"
          aria-label={t("searchTabs.aria")}
          className="inline-flex rounded-full p-1 mb-3"
          style={{
            backgroundColor: "rgba(255,255,255,0.12)",
            border: "1px solid rgba(255,255,255,0.18)",
          }}
        >
          {(
            [
              { key: "cabins" as const, label: t("searchTabs.cabins") },
              { key: "transport" as const, label: t("searchTabs.transport") },
            ] as const
          ).map(({ key, label }) => {
            const active = tab === key
            return (
              <button
                key={key}
                role="tab"
                type="button"
                aria-selected={active}
                onClick={() => setTab(key)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
                  active ? "bg-white text-foreground shadow-sm" : "text-white/85 hover:text-white",
                )}
              >
                {label}
              </button>
            )
          })}
        </div>

        <HeroSearchBar tab={tab} majorHubs={majorHubs} />
      </motion.div>
    </div>
  )
}
