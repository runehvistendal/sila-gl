"use client"

import { useEffect, useState, useTransition } from "react"
import { Anchor, ArrowRight } from "lucide-react"
import { useTranslations } from "next-intl"
import { useRouter } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { createTransportRequest, type TripType } from "./actions"
import { HierarchicalLocationSelect } from "@/components/shared/HierarchicalLocationSelect"
import DatePickerButton from "@/components/shared/DatePickerButton"
import { guestStayRequestHref } from "@/lib/cabinPublicPaths"
import { REGION_HUB_PREFIX } from "@/lib/greenlandLocations"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"

const TRIP_TYPES: { value: TripType; labelKey: string }[] = [
  { value: "one_way", labelKey: "transport_trip_one_way" },
  { value: "round_trip", labelKey: "transport_trip_round" },
]

function ymdDayAfter(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number)
  const dt = new Date(y, m - 1, d + 1)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`
}

export default function AnmodForm() {
  const t = useTranslations("request")
  const tCommon = useTranslations("common")
  const router = useRouter()

  const [fromLoc, setFromLoc] = useState("")
  const [toLoc, setToLoc] = useState("")
  const [desiredDate, setDesiredDate] = useState("")
  const [returnDate, setReturnDate] = useState("")
  const [passengers, setPassengers] = useState(1)
  const [tripType, setTripType] = useState<TripType>("one_way")
  const [description, setDescription] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const needsReturn = tripType === "round_trip"

  useEffect(() => {
    if (!needsReturn || !returnDate || !desiredDate) return
    if (returnDate <= desiredDate) setReturnDate("")
  }, [desiredDate, needsReturn, returnDate])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!fromLoc || !toLoc) {
      setError(t("transport_error_from_to"))
      return
    }
    if (!desiredDate) {
      setError(t("transport_error_date"))
      return
    }
    if (needsReturn) {
      if (!returnDate) {
        setError(t("transport_error_return"))
        return
      }
      if (returnDate <= desiredDate) {
        setError(t("transport_error_return_after"))
        return
      }
    }

    startTransition(async () => {
      const result = await createTransportRequest({
        from_location: fromLoc,
        to_location: toLoc,
        desired_date: desiredDate,
        num_passengers: passengers,
        trip_type: tripType,
        return_date: needsReturn ? returnDate : undefined,
        description: description || undefined,
      })

      if ("error" in result) {
        setError(result.error)
      }
    })
  }

  const returnEarliest = desiredDate ? ymdDayAfter(desiredDate) : undefined

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 bg-white border border-border rounded-2xl p-6 shadow-sm"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="transport-from" className="text-sm font-medium text-foreground">
            {t("transport_from")} <span className="text-destructive">*</span>
          </Label>
          <HierarchicalLocationSelect
            id="transport-from"
            required
            includeRegionOption={false}
            value={fromLoc}
            onChange={(v) => {
              setFromLoc(v)
              if (v === toLoc) setToLoc("")
            }}
            allLabel={t("transport_pick_place")}
            formatRegionSummaryLabel={(r) => t("whole_region", { region: r })}
            placeholder={t("transport_pick_place")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="transport-to" className="text-sm font-medium text-foreground">
            {t("transport_to")} <span className="text-destructive">*</span>
          </Label>
          <HierarchicalLocationSelect
            id="transport-to"
            required
            includeRegionOption={false}
            value={toLoc}
            onChange={setToLoc}
            excludeValues={
              fromLoc && !fromLoc.startsWith(REGION_HUB_PREFIX) ? [fromLoc] : []
            }
            allLabel={t("transport_pick_place")}
            formatRegionSummaryLabel={(r) => t("whole_region", { region: r })}
            placeholder={t("transport_pick_place")}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">{t("transport_trip_type")}</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {TRIP_TYPES.map(({ value, labelKey }) => (
            <button
              key={value}
              type="button"
              onClick={() => setTripType(value)}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-4 text-left transition-colors",
                tripType === value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/30",
              )}
            >
              <span className="text-sm font-medium text-foreground">{t(labelKey)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <span className="block text-sm font-medium text-foreground">
          {needsReturn ? t("transport_date_out") : t("transport_date_single")}{" "}
          <span className="text-destructive">*</span>
        </span>
        <DatePickerButton
          mode="single"
          date={desiredDate}
          onDateChange={setDesiredDate}
          placeholder={t("dates_placeholder")}
          aria-label={needsReturn ? t("transport_date_out") : t("transport_date_single")}
          className="w-full"
        />
      </div>

      {needsReturn && (
        <div className="space-y-2">
          <span className="block text-sm font-medium text-foreground">
            {t("transport_date_return")} <span className="text-destructive">*</span>
          </span>
          <DatePickerButton
            mode="single"
            date={returnDate}
            onDateChange={setReturnDate}
            placeholder={t("transport_date_return")}
            aria-label={t("transport_date_return")}
            earliestYmd={returnEarliest}
            className="w-full"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="transport-passengers" className="text-sm font-medium text-foreground">
          {t("transport_passengers")} <span className="text-destructive">*</span>
        </Label>
        <Input
          id="transport-passengers"
          type="number"
          min={1}
          max={20}
          value={passengers}
          onChange={(e) => setPassengers(Number(e.target.value))}
          required
          className="rounded-xl h-10 w-full sm:max-w-[12rem]"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="transport-description" className="text-sm font-medium text-foreground">
          {t("transport_message")}{" "}
          <span className="text-muted-foreground font-normal">
            ({t("transport_message_optional")})
          </span>
        </Label>
        <Textarea
          id="transport-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("transport_message_placeholder")}
          rows={3}
          className="rounded-xl resize-none"
          maxLength={500}
        />
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex gap-3 pt-1">
        <Button
          type="submit"
          disabled={isPending}
          className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-semibold gap-2"
        >
          <Anchor className="w-4 h-4 shrink-0" />
          {isPending ? tCommon("sending") : t("transport_submit")}
          {!isPending && <ArrowRight className="w-4 h-4 shrink-0" />}
        </Button>
        <Button type="button" variant="outline" className="rounded-xl" onClick={() => router.back()}>
          {tCommon("cancel")}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center pt-1">
        <Link href={guestStayRequestHref} className="text-primary hover:underline font-medium">
          {t("link_stay_request")}
        </Link>
        {" — "}
        <span>{t("stay_cta_hint")}</span>
      </p>
    </form>
  )
}
