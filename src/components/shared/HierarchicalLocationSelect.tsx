"use client"

import { cn } from "@/lib/utils"
import {
  getLocationsGroupedByRegion,
  REGION_HUB_PREFIX,
} from "@/lib/greenlandLocations"

export type HierarchicalLocationSelectProps = Omit<
  React.ComponentPropsWithoutRef<"select">,
  "onChange" | "children"
> & {
  value: string
  onChange: (value: string) => void
  /** Første <option value=""> */
  allLabel: string
  /**
   * Skabelon for regionsammenfatning, fx oversat "Hele {region}" (rå ICU-tekst)
   * → "Hele Diskobugten". Bruges kun hvis `formatRegionSummaryLabel` ikke er sat.
   * OBS: Brug ikke `t("whole_region")` uden `{ region }` — ICU fejler og viser nøglen.
   */
  regionAllLabel?: string
  /** Foretrukken: `r => t("whole_region", { region: r })` (next-intl ICU). */
  formatRegionSummaryLabel?: (regionLabel: string) => string
  /** Synlig placeholder (fx aria); tom option-tekst = allLabel hvis udeladt */
  placeholder?: string
  className?: string
  /** false: kun enkeltd destinationer under regioner (fx transport-anmod med koordinater). */
  includeRegionOption?: boolean
  /** Skjuler options med disse værdier (name_dk eller `region:Label`). */
  excludeValues?: string[]
}

export function HierarchicalLocationSelect({
  value,
  onChange,
  allLabel,
  regionAllLabel,
  formatRegionSummaryLabel,
  placeholder,
  className,
  id,
  includeRegionOption = true,
  excludeValues = [],
  ...rest
}: HierarchicalLocationSelectProps) {
  const ex = new Set(excludeValues.filter(Boolean))
  const groups = getLocationsGroupedByRegion()

  function regionSummaryText(regionLabel: string): string {
    if (formatRegionSummaryLabel) return formatRegionSummaryLabel(regionLabel)
    const template = regionAllLabel ?? ""
    if (template.includes("{region}")) {
      return template.replace(/\{region\}/g, regionLabel)
    }
    if (template.trim()) return `${template} ${regionLabel}`
    return regionLabel
  }

  const emptyLabel = placeholder ?? allLabel

  return (
    <select
      id={id}
      {...rest}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "w-full h-10 rounded-xl border border-input bg-transparent px-3 text-sm text-foreground shadow-sm",
        "focus:outline-none focus:ring-1 focus:ring-[#114788] cursor-pointer",
        className,
      )}
    >
      <option value="">{emptyLabel}</option>
      {groups.map(({ regionLabel, locations }) => (
        <optgroup key={regionLabel} label={regionLabel}>
          {includeRegionOption && !ex.has(`${REGION_HUB_PREFIX}${regionLabel}`) ? (
            <option value={`${REGION_HUB_PREFIX}${regionLabel}`}>
              {regionSummaryText(regionLabel)}
            </option>
          ) : null}
          {locations
            .filter((l) => !ex.has(l.name_dk))
            .map((l) => (
              <option key={`${regionLabel}-${l.postal_code}-${l.name_dk}`} value={l.name_dk}>
                {l.name_dk}
              </option>
            ))}
        </optgroup>
      ))}
    </select>
  )
}
