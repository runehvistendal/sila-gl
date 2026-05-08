"use client"

import { useEffect, useState, useTransition } from "react"
import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { Link, useRouter } from "@/i18n/navigation"
import { Building2, ChevronLeft, MapPin, Tent } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { getAllLocationsSorted } from "@/lib/greenlandLocations"
import DatePickerButton from "@/components/shared/DatePickerButton"
import { GroupedLocationSelect } from "@/components/shared/GroupedLocationSelect"
import { guestStayRequestHref } from "@/lib/cabinPublicPaths"
import { createCabinRequest } from "./actions"
import { cn } from "@/lib/utils"

const LOCATIONS_FOR_REQUEST = getAllLocationsSorted().map((l) => ({
  name: l.name_dk,
  isHub: l.is_major_hub,
}))

export default function AnmodClient() {
  const t = useTranslations("request")
  const tCommon = useTranslations("common")
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [checkIn, setCheckIn] = useState("")
  const [checkOut, setCheckOut] = useState("")
  const [location, setLocation] = useState("")
  const [propertyType, setPropertyType] = useState<"cabin" | "residence">("cabin")

  useEffect(() => {
    const type = searchParams.get("type")
    if (type === "transport") {
      router.replace("/transport/anmod")
      return
    }
    if (type !== "stay") {
      const sp = new URLSearchParams(searchParams.toString())
      sp.set("type", "stay")
      const qs = sp.toString()
      router.replace(qs ? `/anmod?${qs}` : guestStayRequestHref)
    }
  }, [searchParams, router])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!checkIn || !checkOut || checkOut <= checkIn) {
      setError(t("dates_invalid"))
      return
    }
    if (!location) {
      setError(t("pick_destination"))
      return
    }
    const data = new FormData(e.currentTarget)
    data.set("desired_check_in", checkIn)
    data.set("desired_check_out", checkOut)
    data.set("desired_property_type", propertyType)
    setError(null)
    startTransition(async () => {
      const res = await createCabinRequest(data)
      if (res?.error) {
        setError(res.error)
      }
    })
  }

  return (
    <main className="min-h-screen bg-background pt-24">
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-10">
        <Link
          href="/dashboard?tab=requests"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ChevronLeft className="w-4 h-4" /> {tCommon("back")}
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{t("title")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("subtitle")}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-white border border-border rounded-2xl p-6 shadow-sm">
          <input type="hidden" name="desired_check_in" value={checkIn} readOnly />
          <input type="hidden" name="desired_check_out" value={checkOut} readOnly />
          <input type="hidden" name="desired_property_type" value={propertyType} readOnly />

          {/* Opholdstype */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              {t("stay_kind_label")} <span className="text-destructive">*</span>
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPropertyType("cabin")}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-4 text-left transition-colors",
                  propertyType === "cabin"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30",
                )}
              >
                <Tent className="w-5 h-5 text-primary shrink-0" />
                <span className="text-sm font-medium text-foreground">{t("stay_kind_cabin")}</span>
              </button>
              <button
                type="button"
                onClick={() => setPropertyType("residence")}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-4 text-left transition-colors",
                  propertyType === "residence"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30",
                )}
              >
                <Building2 className="w-5 h-5 text-primary shrink-0" />
                <span className="text-sm font-medium text-foreground">{t("stay_kind_residence")}</span>
              </button>
            </div>
          </div>

          <input type="hidden" name="location" value={location} readOnly />

          {/* Destination */}
          <div className="space-y-2">
            <Label htmlFor="stay-destination" className="text-sm font-medium text-foreground">
              <MapPin className="w-3.5 h-3.5 inline mr-1 text-muted-foreground" />
              {t("destination")} <span className="text-destructive">*</span>
            </Label>
            <GroupedLocationSelect
              id="stay-destination"
              value={location}
              onChange={setLocation}
              locations={LOCATIONS_FOR_REQUEST}
              placeholder={t("select_city")}
              majorGroupLabel={t("location_group_major")}
              otherGroupLabel={t("location_group_other")}
            />
          </div>

          {/* Datoer — samme kalender som filtre/forside */}
          <div className="space-y-2">
            <span className="block text-sm font-medium text-foreground">
              {t("dates_label")} <span className="text-destructive">*</span>
            </span>
            <DatePickerButton
              mode="range"
              checkIn={checkIn}
              checkOut={checkOut}
              onRangeChange={(ci, co) => {
                setCheckIn(ci)
                setCheckOut(co)
              }}
              placeholder={t("dates_placeholder")}
              aria-label={t("dates_label")}
              className="w-full"
            />
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <span>{t("check_in_hint")}: {checkIn ? checkIn : "—"}</span>
              <span>{t("check_out_hint")}: {checkOut ? checkOut : "—"}</span>
            </div>
          </div>

          {/* Gæster + budget */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                {t("guests")} <span className="text-destructive">*</span>
              </label>
              <Input
                type="number"
                name="num_guests"
                required
                min={1}
                max={20}
                defaultValue={2}
                className="rounded-xl h-10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                {t("budget_label")}
              </label>
              <Input
                type="number"
                name="max_price_kr"
                min={0}
                placeholder={tCommon("optional")}
                className="rounded-xl h-10"
              />
            </div>
          </div>

          {/* Strukturerede hurtige felter — nemmere for udbydere at skimme */}
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 space-y-3">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
              {t("quick_fields_title")}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t("quick_fields_hint")}
            </p>
            <div>
              <Label htmlFor="pref_sleeping" className="text-sm font-medium">
                {t("pref_sleeping_label")}
              </Label>
              <Input
                id="pref_sleeping"
                name="pref_sleeping"
                placeholder={t("pref_sleeping_placeholder")}
                className="rounded-xl h-10 mt-1"
              />
            </div>
            <div>
              <Label htmlFor="pref_must_have" className="text-sm font-medium">
                {t("pref_must_have_label")}
              </Label>
              <Input
                id="pref_must_have"
                name="pref_must_have"
                placeholder={t("pref_must_have_placeholder")}
                className="rounded-xl h-10 mt-1"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              {t("description_label")}
            </label>
            <p className="text-xs text-muted-foreground mb-2">{t("description_helper")}</p>
            <Textarea
              name="description"
              placeholder={t("description_placeholder")}
              rows={3}
              className="rounded-xl resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <Button
              type="submit"
              disabled={isPending}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-semibold"
            >
              {isPending ? tCommon("sending") : t("submit")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => router.back()}
            >
              {tCommon("cancel")}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center pt-1">
            <Link href="/transport/anmod" className="text-primary hover:underline font-medium">
              {t("link_transport_request")}
            </Link>
            {" — "}
            <span>{t("transport_cta_hint")}</span>
          </p>
        </form>
      </div>
    </main>
  )
}
