"use client"

import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { Home, ArrowRight } from "lucide-react"
import CabinCard, { type CabinCardData } from "./CabinCard"

export default function CabinGrid({
  cabins,
  total,
}: {
  cabins: CabinCardData[]
  total: number
}) {
  const t = useTranslations("cabins")

  if (cabins.length === 0) {
    return (
      <div className="text-center py-24">
        <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-5">
          <Home size={24} className="text-muted-foreground/50" />
        </div>
        <p className="text-lg font-medium text-foreground mb-1">{t("grid_empty_title")}</p>
        <p className="text-sm text-muted-foreground mb-6">{t("grid_empty_hint")}</p>
        <Link href="/hytter" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80">
          {t("grid_show_all")} <ArrowRight size={14} />
        </Link>
      </div>
    )
  }

  return (
    <>
      <p className="text-sm text-muted-foreground mb-6">{t("grid_result_count", { count: total })}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {cabins.map((cabin, index) => (
          <CabinCard key={cabin.id} cabin={cabin} resultIndex={index} />
        ))}
      </div>
    </>
  )
}
