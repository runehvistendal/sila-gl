"use client"

import { useActionState, useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { createBolig, updateBolig, type BoligFormState } from "./actions"
import {
  RESIDENCE_FACILITIES,
  RESIDENCE_SECTION_LABELS,
  getResidenceFacilityValueSet,
  type ResidenceFacilitySectionKey,
} from "@/lib/amenityMeta"
import { GREENLAND_LOCATIONS } from "@/lib/greenlandLocations"
import AddOnServicesEditor, { type AddOnService } from "@/components/shared/AddOnServicesEditor"
import TransferRouteEditor from "@/components/cabins/TransferRouteEditor"
import type { TransferRoute } from "@/types/transfer"
import { oreToKr } from "@/lib/money"
import CabinImageUpload from "@/components/cabins/CabinImageUpload"
import PendingCabinImageUpload from "@/components/cabins/PendingCabinImageUpload"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const MAJOR_HUBS = GREENLAND_LOCATIONS.filter((l) => l.is_major_hub)
const FIXED = getResidenceFacilityValueSet()

function splitFacilities(facilities: string[] | null | undefined) {
  const list = facilities ?? []
  const fixedSel = list.filter((f) => FIXED.has(f))
  const custom = list.filter((f) => !FIXED.has(f))
  return { fixedSel, custom }
}

export type InitialBolig = {
  id: string
  title: string
  description: string
  location_hub: string
  max_guests: number
  bedrooms: number
  bathrooms: number
  residence_subtype: string
  location_subtype: string
  price_per_night_ore: number
  instant_book: boolean
  facilities: string[] | null
  addon_services: unknown
  offers_transport: boolean
  transport_from: string | null
  transport_price_roundtrip_ore: number | null
  images: string[] | null
  transfer_routes?: TransferRoute[]
}

interface Props {
  mode: "create" | "edit"
  initialBolig?: InitialBolig
}

export default function BoligForm({ mode, initialBolig }: Props) {
  const t = useTranslations("create")
  const tRes = useTranslations("residence.form")
  const tAmenity = useTranslations("amenities.residence")
  const tCommon = useTranslations("common")

  const action = mode === "edit" ? updateBolig : createBolig
  const [state, formAction, isPending] = useActionState<BoligFormState, FormData>(action, null)

  const { fixedSel: initFixed, custom: initCustom } = initialBolig
    ? splitFacilities(initialBolig.facilities)
    : { fixedSel: [], custom: [] }

  const [description, setDescription] = useState(initialBolig?.description ?? "")
  const [locationHub, setLocationHub] = useState(initialBolig?.location_hub ?? "")
  const [residenceSubtype, setResidenceSubtype] = useState(
    initialBolig?.residence_subtype ?? "",
  )
  const [locationSubtype, setLocationSubtype] = useState(
    initialBolig?.location_subtype ?? "",
  )
  const [instantBook, setInstantBook] = useState(initialBolig?.instant_book ?? false)
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>(initFixed)
  const [customFacilities, setCustomFacilities] = useState<string[]>(initCustom)
  const [customInput, setCustomInput] = useState("")

  const [addonServices, setAddonServices] = useState<AddOnService[]>(() => {
    if (!initialBolig?.addon_services) return []
    if (Array.isArray(initialBolig.addon_services)) {
      return initialBolig.addon_services as AddOnService[]
    }
    return []
  })

  const [offersTransport, setOffersTransport] = useState(
    initialBolig?.offers_transport ?? false,
  )
  const [pendingImageUrls, setPendingImageUrls] = useState<string[]>([])

  const [offersTransferRoutes, setOffersTransferRoutes] = useState(
    () => (initialBolig?.transfer_routes?.length ?? 0) > 0,
  )
  const [transferRoutes, setTransferRoutes] = useState<TransferRoute[]>(
    () => initialBolig?.transfer_routes ?? [],
  )

  const [transportFrom, setTransportFrom] = useState(initialBolig?.transport_from ?? "")
  const [transportPriceKr, setTransportPriceKr] = useState(
    initialBolig?.transport_price_roundtrip_ore != null
      ? String(Math.round(oreToKr(initialBolig.transport_price_roundtrip_ore)))
      : "",
  )

  useEffect(() => {
    if (initialBolig) {
      setDescription(initialBolig.description)
      setLocationHub(initialBolig.location_hub)
      setResidenceSubtype(initialBolig.residence_subtype)
      setLocationSubtype(initialBolig.location_subtype)
      setInstantBook(initialBolig.instant_book)
      const { fixedSel, custom } = splitFacilities(initialBolig.facilities)
      setSelectedFacilities(fixedSel)
      setCustomFacilities(custom)
      if (Array.isArray(initialBolig.addon_services)) {
        setAddonServices(initialBolig.addon_services as AddOnService[])
      }
      setOffersTransport(initialBolig.offers_transport)
      setTransportFrom(initialBolig.transport_from ?? "")
      setTransportPriceKr(
        initialBolig.transport_price_roundtrip_ore != null
          ? String(Math.round(oreToKr(initialBolig.transport_price_roundtrip_ore)))
          : "",
      )
      setTransferRoutes(initialBolig.transfer_routes ?? [])
      setOffersTransferRoutes((initialBolig.transfer_routes?.length ?? 0) > 0)
    }
  }, [initialBolig])

  function toggleFacility(value: string) {
    setSelectedFacilities((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    )
  }

  function addCustomFromInput() {
    const parts = customInput
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (parts.length === 0) return
    setCustomFacilities((prev) => {
      const next = new Set([...prev, ...parts])
      return Array.from(next)
    })
    setCustomInput("")
  }

  function removeCustom(tag: string) {
    setCustomFacilities((prev) => prev.filter((t) => t !== tag))
  }

  const allFacilityValues = [...selectedFacilities, ...customFacilities]
  const singlePreviewKr =
    transportPriceKr && !Number.isNaN(Number(transportPriceKr))
      ? Math.round(Number(transportPriceKr) * 0.6)
      : null

  const residenceSectionKeys = Object.keys(RESIDENCE_FACILITIES) as ResidenceFacilitySectionKey[]

  return (
    <form action={formAction} className="space-y-8">
      {mode === "edit" && initialBolig && (
        <input type="hidden" name="cabin_id" value={initialBolig.id} />
      )}

      <input type="hidden" name="location_hub" value={locationHub} />
      <input type="hidden" name="residence_subtype" value={residenceSubtype} />
      <input type="hidden" name="location_subtype" value={locationSubtype} />
      <input type="hidden" name="instant_book" value={instantBook ? "on" : ""} />
      {allFacilityValues.map((fac) => (
        <input key={fac} type="hidden" name="facilities" value={fac} />
      ))}
      <input
        type="hidden"
        name="addon_services_json"
        value={JSON.stringify(addonServices)}
      />
      <input
        type="hidden"
        name="offers_transport"
        value={offersTransport ? "on" : ""}
      />
      <input
        type="hidden"
        name="offers_transfer_routes"
        value={offersTransferRoutes ? "on" : ""}
      />
      <input
        type="hidden"
        name="transfer_routes_json"
        value={JSON.stringify(transferRoutes)}
      />

      <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-3">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          {tRes("section_title")}
        </p>
        <div>
          <Label htmlFor="title">
            {tRes("title_label")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="title"
            name="title"
            maxLength={80}
            defaultValue={initialBolig?.title}
            placeholder={tRes("title_placeholder")}
            className="mt-1 rounded-xl"
            required
          />
          <FieldError messages={state?.errors?.title} />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-3">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          {t("section_description")}
        </p>
        <div>
          <Label htmlFor="description">
            {tRes("desc_label")} <span className="text-destructive">*</span>
          </Label>
          <textarea
            id="description"
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            minLength={50}
            rows={5}
            placeholder={tRes("desc_placeholder")}
            className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
          />
          <div className="flex items-center justify-between mt-1">
            <FieldError messages={state?.errors?.description} />
            <span
              className={`text-xs ml-auto ${
                description.length < 50 ? "text-muted-foreground" : "text-green-600"
              }`}
            >
              {description.length} {t("char_count_suffix")}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-3">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          {t("section_destination")}
        </p>
        <div>
          <Label>
            {t("nearest_city_label")} <span className="text-destructive">*</span>
          </Label>
          <Select onValueChange={setLocationHub} value={locationHub} required>
            <SelectTrigger className="mt-1 rounded-xl">
              <SelectValue placeholder={t("select_destination")} />
            </SelectTrigger>
            <SelectContent>
              {MAJOR_HUBS.map((loc) => (
                <SelectItem key={`${loc.postal_code}-${loc.name_dk}`} value={loc.name_dk}>
                  {loc.name_dk}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError messages={state?.errors?.location_hub} />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-4">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {tRes("section_residence_kind")}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>{tRes("residence_subtype_label")} *</Label>
            <Select value={residenceSubtype} onValueChange={setResidenceSubtype} required>
              <SelectTrigger className="mt-1 rounded-xl">
                <SelectValue placeholder={tRes("residence_subtype_placeholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="house">{tRes("subtype_house")}</SelectItem>
                <SelectItem value="apartment">{tRes("subtype_apartment")}</SelectItem>
                <SelectItem value="room">{tRes("subtype_room")}</SelectItem>
                <SelectItem value="other">{tRes("subtype_other")}</SelectItem>
              </SelectContent>
            </Select>
            <FieldError messages={state?.errors?.residence_subtype} />
          </div>
          <div>
            <Label>{tRes("location_subtype_label")} *</Label>
            <Select value={locationSubtype} onValueChange={setLocationSubtype} required>
              <SelectTrigger className="mt-1 rounded-xl">
                <SelectValue placeholder={tRes("location_subtype_placeholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="city">{tRes("loc_city")}</SelectItem>
                <SelectItem value="village">{tRes("loc_village")}</SelectItem>
              </SelectContent>
            </Select>
            <FieldError messages={state?.errors?.location_subtype} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-3">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          {t("section_capacity")}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="max_guests">
              {t("max_guests_label")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="max_guests"
              name="max_guests"
              type="number"
              min={1}
              max={30}
              defaultValue={initialBolig?.max_guests ?? 4}
              className="mt-1 rounded-xl"
            />
            <FieldError messages={state?.errors?.max_guests} />
          </div>
          <div>
            <Label htmlFor="bedrooms">
              {t("bedrooms_label")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="bedrooms"
              name="bedrooms"
              type="number"
              min={0}
              max={20}
              defaultValue={initialBolig?.bedrooms ?? 1}
              className="mt-1 rounded-xl"
            />
            <FieldError messages={state?.errors?.bedrooms} />
          </div>
          <div>
            <Label htmlFor="bathrooms">
              {tRes("bathrooms_label")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="bathrooms"
              name="bathrooms"
              type="number"
              min={0}
              max={20}
              defaultValue={initialBolig?.bathrooms ?? 1}
              className="mt-1 rounded-xl"
            />
            <FieldError messages={state?.errors?.bathrooms} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-4">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {tRes("section_pricing")}
        </p>
        <div>
          <Label htmlFor="price_per_night_kr">
            {tRes("price_per_night_label")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="price_per_night_kr"
            name="price_per_night_kr"
            type="number"
            min={1}
            step={1}
            defaultValue={
              initialBolig ? Math.max(1, Math.round(oreToKr(initialBolig.price_per_night_ore))) : ""
            }
            placeholder="850"
            className="mt-1 rounded-xl"
            required
          />
          <FieldError messages={state?.errors?.price_per_night_kr} />
        </div>
        <div className="flex items-center gap-3">
          <Switch
            id="instant_book_switch"
            checked={instantBook}
            onCheckedChange={setInstantBook}
          />
          <Label htmlFor="instant_book_switch" className="cursor-pointer">
            {tRes("instant_book_label")}
          </Label>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-5">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {t("section_facilities")}
        </p>
        {residenceSectionKeys.map((sectionKey) => (
          <div key={String(sectionKey)}>
            <p className="text-xs font-semibold text-muted-foreground mb-2">
              {RESIDENCE_SECTION_LABELS[sectionKey]}
            </p>
            <div className="flex flex-wrap gap-2">
              {RESIDENCE_FACILITIES[sectionKey].map((fac) => (
                <button
                  key={fac.value}
                  type="button"
                  onClick={() => toggleFacility(fac.value)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-all ${
                    selectedFacilities.includes(fac.value)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-white border-border hover:border-primary/40"
                  }`}
                >
                  {selectedFacilities.includes(fac.value) && <span>✓</span>}
                  {tAmenity(fac.labelKey)}
                </button>
              ))}
            </div>
          </div>
        ))}

        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">{t("section_other")}</p>
          <p className="text-xs text-muted-foreground mb-2">{t("custom_facility_hint")}</p>
          <div className="flex flex-wrap gap-2 mb-2 min-h-6">
            {customFacilities.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-full text-sm border border-primary/40 bg-primary/5"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeCustom(tag)}
                  className="p-0.5 rounded hover:bg-primary/20"
                  aria-label={t("remove_tag", { tag })}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <Input
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                addCustomFromInput()
              }
            }}
            onBlur={() => {
              if (customInput.trim()) addCustomFromInput()
            }}
            placeholder={t("custom_facility_placeholder")}
            className="rounded-xl"
          />
        </div>
      </div>

      {/* Transfer til/fra ophold (ruter) */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-4">
        <div className="flex items-start gap-3">
          <Switch
            id="offers_transfer_routes_switch_bolig"
            checked={offersTransferRoutes}
            onCheckedChange={setOffersTransferRoutes}
          />
          <div className="space-y-1 min-w-0">
            <Label htmlFor="offers_transfer_routes_switch_bolig" className="cursor-pointer">
              Tilbyd transfer
            </Label>
            <p className="text-sm text-muted-foreground">
              Gæster kan tilkøbe transport til/fra dit ophold
            </p>
          </div>
        </div>
        {offersTransferRoutes && (
          <TransferRouteEditor
            cabinId={initialBolig?.id ?? "new-cabin"}
            initialRoutes={transferRoutes}
            onChange={setTransferRoutes}
          />
        )}
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-3">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {t("section_addon_services")}
        </p>
        <AddOnServicesEditor
          services={addonServices}
          onChange={setAddonServices}
          type="cabin"
        />
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-4">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {tRes("section_transfer")}
        </p>
        <div className="flex items-center gap-3">
          <Switch
            id="offers_transport_switch"
            checked={offersTransport}
            onCheckedChange={setOffersTransport}
          />
          <Label htmlFor="offers_transport_switch" className="cursor-pointer">
            {tRes("offers_transfer_label")}
          </Label>
        </div>

        {offersTransport && (
          <div className="space-y-4 pt-2">
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 space-y-2">
              <p>{t("transport_price_info")}</p>
              <p>{t("transport_oneway_info")}</p>
            </div>
            <div>
              <Label htmlFor="transport_from">
                {t("transport_from_label")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="transport_from"
                name="transport_from"
                value={transportFrom}
                onChange={(e) => setTransportFrom(e.target.value)}
                placeholder={t("transport_from_placeholder")}
                className="mt-1 rounded-xl"
              />
              <FieldError messages={state?.errors?.transport_from} />
            </div>
            <div>
              <Label htmlFor="transport_price_roundtrip_kr">
                {t("transport_roundtrip_price_label")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="transport_price_roundtrip_kr"
                name="transport_price_roundtrip_kr"
                type="number"
                min={0}
                step={1}
                value={transportPriceKr}
                onChange={(e) => setTransportPriceKr(e.target.value)}
                placeholder="800"
                className="mt-1 rounded-xl"
              />
              <FieldError messages={state?.errors?.transport_price_roundtrip_kr} />
            </div>
            {singlePreviewKr != null && transportPriceKr !== "" && (
              <p className="text-sm text-muted-foreground bg-muted/50 rounded-xl px-4 py-3">
                {t("single_ticket_price")}{" "}
                <span className="font-semibold text-foreground">
                  {singlePreviewKr.toLocaleString("da-DK")} kr.
                </span>{" "}
                <span className="text-xs">{t("auto_calculated")}</span>
              </p>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          {t("section_images")}
        </p>
        {mode === "edit" && initialBolig ? (
          <CabinImageUpload cabinId={initialBolig.id} initialImages={initialBolig.images ?? []} />
        ) : (
          <>
            {pendingImageUrls.map((url) => (
              <input key={url} type="hidden" name="image_urls" value={url} />
            ))}
            <PendingCabinImageUpload onImagesChange={setPendingImageUrls} />
          </>
        )}
      </div>

      {state?.errors?._form && (
        <p className="text-sm text-destructive">{state.errors._form[0]}</p>
      )}

      <Button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl h-12 text-base font-semibold"
        style={mode === "create" ? { backgroundColor: "#4A9CC7" } : undefined}
      >
        {isPending
          ? tCommon("saving")
          : mode === "edit"
            ? t("save_changes")
            : t("save_and_continue")}
      </Button>
    </form>
  )
}

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null
  return <p className="text-xs text-destructive mt-1">{messages[0]}</p>
}
