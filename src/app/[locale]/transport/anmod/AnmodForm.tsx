"use client"

import { useState, useTransition } from "react"
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

export interface AnmodInitial {
  from?: string
  to?: string
  date?: string
  returnDate?: string
  passengers?: number
  bookingId?: string
}

/** Afgangsvinduer i hele timer, 05:00–22:00 (Nuuk-tid) */
const HOURS = Array.from({ length: 18 }, (_, i) => `${String(i + 5).padStart(2, "0")}:00`)

export default function AnmodForm({ initial = {} }: { initial?: AnmodInitial }) {
  const t = useTranslations("request")
  const tCommon = useTranslations("common")
  const router = useRouter()

  const [fromLoc, setFromLoc] = useState(initial.from ?? "")
  const [toLoc, setToLoc] = useState(initial.to ?? "")
  const [desiredDate, setDesiredDate] = useState(initial.date ?? "")
  const [returnDate, setReturnDate] = useState(initial.returnDate ?? "")
  const [passengers, setPassengers] = useState(initial.passengers ?? 1)
  const [tripType, setTripType] = useState<TripType>(initial.returnDate ? "round_trip" : "one_way")
  const [timeFrom, setTimeFrom] = useState("")
  const [timeTo, setTimeTo] = useState("")
  const [description, setDescription] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const needsReturn = tripType === "round_trip"

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

    if (timeFrom && timeTo && timeTo <= timeFrom) {
      setError(t("transport_error_time_window"))
      return
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
        preferred_time_from: timeFrom || undefined,
        preferred_time_to: timeTo || undefined,
        linked_cabin_booking_id: initial.bookingId,
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
          onDateChange={(d) => {
            setDesiredDate(d)
            // En returdato før den nye udrejse giver ikke mening — ryd den
            if (returnDate && d && returnDate <= d) setReturnDate("")
          }}
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

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-foreground">
          {t("transport_time_window")}{" "}
          <span className="text-muted-foreground font-normal">({t("transport_message_optional")})</span>
        </legend>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="transport-time-from" className="text-xs text-muted-foreground">
              {t("transport_time_from")}
            </Label>
            <select
              id="transport-time-from"
              value={timeFrom}
              onChange={(e) => setTimeFrom(e.target.value)}
              className="mt-1 w-full h-11 rounded-xl border border-input bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">{t("transport_time_any")}</option>
              {HOURS.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="transport-time-to" className="text-xs text-muted-foreground">
              {t("transport_time_to")}
            </Label>
            <select
              id="transport-time-to"
              value={timeTo}
              onChange={(e) => setTimeTo(e.target.value)}
              className="mt-1 w-full h-11 rounded-xl border border-input bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">{t("transport_time_any")}</option>
              {HOURS.filter((h) => !timeFrom || h > timeFrom).map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{t("transport_time_hint")}</p>
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="transport-passengers" className="text-sm font-medium text-foreground">
          {t("transport_passengers")} <span className="text-destructive">*</span>
        </Label>
        <Input
          id="transport-passengers"
          type="number"
          min={1}
          max={12}
          inputMode="numeric"
          value={passengers}
          onChange={(e) => setPassengers(Math.max(1, Math.min(12, Math.floor(Number(e.target.value)) || 1)))}
          required
          aria-describedby="transport-passengers-hint"
          className="rounded-xl h-11 w-full sm:max-w-[12rem]"
        />
        <p id="transport-passengers-hint" className="text-xs text-muted-foreground">
          {t("transport_passengers_hint")}
        </p>
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
        <p role="alert" className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
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
