"use client"

import { useMemo } from "react"
import { useLocale } from "next-intl"
import { Link } from "@/i18n/navigation"
import OplevelsesFilters, { type OplevelseFilterValues } from "./OplevelsesFilters"
import OplevelsesCard, { type OplevelseCardData } from "./OplevelsesCard"

interface Props {
  experiences: OplevelseCardData[]
  initialFilters: OplevelseFilterValues
}

export default function OplevelsesClient({ experiences, initialFilters }: Props) {
  const locale = useLocale()

  const title = locale === "en" ? "Experiences" : "Oplevelser"
  const emptyMsg =
    locale === "en" ? "No experiences match your search" : "Ingen oplevelser matcher din søgning"
  const resetLabel = locale === "en" ? "Reset filters" : "Nulstil filtre"
  const countLabel =
    experiences.length === 1
      ? locale === "en"
        ? "1 experience found"
        : "1 oplevelse fundet"
      : locale === "en"
        ? `${experiences.length} experiences found`
        : `${experiences.length} oplevelser fundet`

  const hasFilters = !!(initialFilters.hub || initialFilters.date || initialFilters.category)

  const stableFilters = useMemo(
    () => initialFilters,
    [initialFilters.hub, initialFilters.date, initialFilters.category],
  )

  return (
    <>
      <div className="bg-card border-b border-border pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{title}</h1>
          <OplevelsesFilters initial={stableFilters} />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        <p className="text-sm text-muted-foreground">{countLabel}</p>

        {experiences.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-16 text-center space-y-4">
            <p className="text-muted-foreground">{emptyMsg}</p>
            {hasFilters ? (
              <Link
                href="/oplevelser"
                className="inline-flex text-sm font-semibold text-primary hover:underline"
              >
                {resetLabel}
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {experiences.map((row, i) => (
              <OplevelsesCard key={row.id} row={row} resultIndex={i} locale={locale} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
