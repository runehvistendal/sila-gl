"use client"

import { useState, useMemo } from "react"
import { useTranslations } from "next-intl"
import CabinFilters, { type FilterValues } from "@/components/cabins/CabinFilters"
import CabinGrid from "@/components/cabins/CabinGrid"
import type { CabinCardData } from "@/components/cabins/CabinCard"

interface Props {
  cabins: CabinCardData[]
  initialFilters: FilterValues
}

export default function HytterClient({ cabins, initialFilters }: Props) {
  const t = useTranslations("cabins")
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([])

  const filteredCabins = useMemo(() => {
    if (selectedAmenities.length === 0) return cabins
    return cabins.filter((c) =>
      selectedAmenities.every((a) => c.amenities?.includes(a))
    )
  }, [cabins, selectedAmenities])

  return (
    <>
      {/* ── Filter header ── */}
      <div className="bg-card border-b border-border pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {t("pageTitle")}
          </h1>
          <CabinFilters
            initialFilters={initialFilters}
            selectedAmenities={selectedAmenities}
            onAmenityChange={setSelectedAmenities}
          />
        </div>
      </div>

      {/* ── Grid ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <CabinGrid cabins={filteredCabins} total={filteredCabins.length} />
        {selectedAmenities.length > 0 && filteredCabins.length === 0 && (
          <p className="text-center text-muted-foreground text-sm mt-8">
            {t("noMatch")}{" "}
            <button
              type="button"
              onClick={() => setSelectedAmenities([])}
              className="text-primary hover:underline"
            >
              {t("clearFilters")}
            </button>
          </p>
        )}
      </div>
    </>
  )
}
