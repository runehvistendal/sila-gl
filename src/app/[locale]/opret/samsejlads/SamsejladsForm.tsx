"use client"

import { useActionState, useState } from "react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { GREENLAND_LOCATIONS } from "@/lib/greenlandLocations"
import { createSamsejlads, type SamsejladsFormState } from "./actions"
import { PH_STORE } from "@/lib/analytics/posthog-events"

interface Boat {
  id: string
  name: string
  boat_type: string | null
  capacity: number
}

interface Props {
  boats: Boat[]
  defaultBoatId?: string
}

const SORTED_LOCATIONS = [...GREENLAND_LOCATIONS].sort((a, b) =>
  a.name_dk.localeCompare(b.name_dk, "da"),
)

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null
  return <p className="text-xs text-destructive mt-1">{messages[0]}</p>
}

export default function SamsejladsForm({ boats, defaultBoatId }: Props) {
  const t = useTranslations("create")
  const tCommon = useTranslations("common")

  const [state, formAction, isPending] = useActionState<SamsejladsFormState, FormData>(
    createSamsejlads,
    null,
  )

  const [boatId, setBoatId] = useState(defaultBoatId ?? "")
  const [fromLocation, setFromLocation] = useState("")
  const [toLocation, setToLocation] = useState("")
  const [returtur, setReturtur] = useState(false)
  const [priceRoundtripKr, setPriceRoundtripKr] = useState("")
  const [priceOneWayKr, setPriceOneWayKr] = useState("")
  const [oneWayUserEdited, setOneWayUserEdited] = useState(false)

  const suggestedOneWay =
    priceRoundtripKr && !isNaN(Number(priceRoundtripKr)) && Number(priceRoundtripKr) > 0
      ? Math.round(Number(priceRoundtripKr) * 0.6)
      : null

  const handleRoundtripChange = (val: string) => {
    setPriceRoundtripKr(val)
    if (!oneWayUserEdited) {
      const n = Number(val)
      if (val && !isNaN(n) && n > 0) {
        setPriceOneWayKr(String(Math.round(n * 0.6)))
      } else {
        setPriceOneWayKr("")
      }
    }
  }

  const today = new Date().toISOString().split("T")[0]

  return (
    <form
      action={formAction}
      onSubmit={() => {
        try {
          const el = document.getElementById("total_pladser") as HTMLInputElement | null
          const seats = Math.max(1, Math.min(20, Number(el?.value ?? 1)))
          sessionStorage.setItem(
            PH_STORE.rideSharePending,
            JSON.stringify({
              from_location: fromLocation,
              to_location: toLocation,
              seats,
              roundtrip: returtur,
            }),
          )
        } catch {
          /* ignore */
        }
      }}
      className="space-y-6"
    >
      <input type="hidden" name="boat_id" value={boatId} />
      <input type="hidden" name="from_location" value={fromLocation} />
      <input type="hidden" name="to_location" value={toLocation} />

      {state?.errors?._form && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.errors._form[0]}
        </div>
      )}

      {/* Båd */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-3">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {t("section_boat")}
        </p>
        {boats.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("no_boats")}{" "}
            <Link href="/opret/baad" className="underline text-foreground">
              {t("register_a_boat")}
            </Link>{" "}
            først.
          </p>
        ) : (
          <div>
            <Label>{t("select_boat_label")} <span className="text-destructive">*</span></Label>
            <Select onValueChange={setBoatId} value={boatId} required>
              <SelectTrigger className="mt-1 rounded-xl">
                <SelectValue placeholder={t("select_boat_placeholder")} />
              </SelectTrigger>
              <SelectContent>
                {boats.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                    {b.boat_type ? ` — ${b.boat_type}` : ""}
                    {` (${b.capacity} ${tCommon("seats")})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError messages={state?.errors?.boat_id} />
          </div>
        )}
      </div>

      {/* Rute */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-4">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {t("section_route")}
        </p>
        <div>
          <Label>{tCommon("from")} <span className="text-destructive">*</span></Label>
          <Select onValueChange={setFromLocation} value={fromLocation} required>
            <SelectTrigger className="mt-1 rounded-xl">
              <SelectValue placeholder={t("departure_city_placeholder")} />
            </SelectTrigger>
            <SelectContent>
              {SORTED_LOCATIONS.map((l) => (
                <SelectItem key={`${l.postal_code}-${l.name_dk}`} value={l.name_dk}>
                  {l.name_dk}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError messages={state?.errors?.from_location} />
        </div>

        <div>
          <Label>{tCommon("to")} <span className="text-destructive">*</span></Label>
          <Select onValueChange={setToLocation} value={toLocation} required>
            <SelectTrigger className="mt-1 rounded-xl">
              <SelectValue placeholder={t("arrival_city_placeholder")} />
            </SelectTrigger>
            <SelectContent>
              {SORTED_LOCATIONS.filter((l) => l.name_dk !== fromLocation).map((l) => (
                <SelectItem key={`${l.postal_code}-${l.name_dk}`} value={l.name_dk}>
                  {l.name_dk}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError messages={state?.errors?.to_location} />
        </div>
      </div>

      {/* Afgang */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-4">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {t("section_departure")}
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="afgang_dato">{tCommon("date")} <span className="text-destructive">*</span></Label>
            <Input
              id="afgang_dato"
              name="afgang_dato"
              type="date"
              min={today}
              className="mt-1 rounded-xl"
              required
            />
            <FieldError messages={state?.errors?.afgang_dato} />
          </div>
          <div>
            <Label htmlFor="afgang_tid">{t("time_label")} <span className="text-destructive">*</span></Label>
            <Input
              id="afgang_tid"
              name="afgang_tid"
              type="time"
              className="mt-1 rounded-xl"
              required
            />
            <FieldError messages={state?.errors?.afgang_tid} />
          </div>
        </div>
      </div>

      {/* Pladser + pris */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-4">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {t("section_seats_and_price")}
        </p>
        <div>
          <Label htmlFor="total_pladser">{t("available_seats_label")} <span className="text-destructive">*</span></Label>
          <Input
            id="total_pladser"
            name="total_pladser"
            type="number"
            min={1}
            max={20}
            defaultValue={1}
            className="mt-1 rounded-xl"
            required
          />
          <FieldError messages={state?.errors?.total_pladser} />
        </div>
        <div>
          <Label htmlFor="pris_roundtrip_kr">
            {t("roundtrip_price_label")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="pris_roundtrip_kr"
            name="pris_roundtrip_kr"
            type="number"
            min={0}
            step={1}
            value={priceRoundtripKr}
            onChange={(e) => handleRoundtripChange(e.target.value)}
            placeholder="800"
            className="mt-1 rounded-xl"
            required
          />
          <FieldError messages={state?.errors?.pris_roundtrip_kr} />
        </div>
        <div>
          <Label htmlFor="pris_oneway_kr">{t("oneway_price_label")}</Label>
          <Input
            id="pris_oneway_kr"
            name="pris_oneway_kr"
            type="number"
            min={0}
            step={1}
            value={priceOneWayKr}
            onChange={(e) => {
              setOneWayUserEdited(true)
              setPriceOneWayKr(e.target.value)
            }}
            placeholder={suggestedOneWay != null ? String(suggestedOneWay) : "480"}
            className="mt-1 rounded-xl"
          />
          {priceOneWayKr !== "" && (
            <p className="text-sm text-gray-500 mt-1">
              {t("oneway_price_suggestion", { price: Number(priceOneWayKr).toLocaleString("da-DK") })}
            </p>
          )}
          <FieldError messages={state?.errors?.pris_oneway_kr} />
        </div>
      </div>

      {/* Beskrivelse */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-3">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {t("section_description")}
        </p>
        <div>
          <Label htmlFor="beskrivelse">{t("trip_desc_label")}</Label>
          <textarea
            id="beskrivelse"
            name="beskrivelse"
            rows={3}
            placeholder={t("trip_desc_placeholder")}
            className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
          />
        </div>
      </div>

      {/* Returtur */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-4">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {t("section_return")}
        </p>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="returtur"
            value="on"
            checked={returtur}
            onChange={(e) => setReturtur(e.target.checked)}
            className="w-4 h-4 accent-primary"
          />
          <span className="text-sm font-medium">{t("offers_return")}</span>
        </label>

        {returtur && (
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div>
              <Label htmlFor="retur_dato">{t("return_date_label")} <span className="text-destructive">*</span></Label>
              <Input
                id="retur_dato"
                name="retur_dato"
                type="date"
                min={today}
                className="mt-1 rounded-xl"
              />
              <FieldError messages={state?.errors?.retur_dato} />
            </div>
            <div>
              <Label htmlFor="retur_tid">{t("return_time_label")} <span className="text-destructive">*</span></Label>
              <Input
                id="retur_tid"
                name="retur_tid"
                type="time"
                className="mt-1 rounded-xl"
              />
              <FieldError messages={state?.errors?.retur_tid} />
            </div>
          </div>
        )}
      </div>

      <Button
        type="submit"
        disabled={isPending || boats.length === 0}
        className="w-full rounded-xl h-12 text-base font-semibold"
        style={{ backgroundColor: "#4A9CC7" }}
      >
        {isPending ? t("creating_trip") : t("create_trip_button")}
      </Button>
    </form>
  )
}
