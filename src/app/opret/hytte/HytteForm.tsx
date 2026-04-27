"use client"

import { useActionState, useState, useEffect } from "react"
import { createHytte, updateHytte, type HytteFormState } from "./actions"
import { CABIN_FACILITIES, FACILITY_SECTION_LABELS, getFixedFacilityValueSet } from "@/lib/cabinFacilities"
import { GREENLAND_LOCATIONS } from "@/lib/greenlandLocations"
import AddOnServicesEditor, { type AddOnService } from "@/components/shared/AddOnServicesEditor"
import { oreToKr } from "@/lib/money"
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
const FIXED = getFixedFacilityValueSet()

function splitFacilities(facilities: string[] | null | undefined) {
  const list = facilities ?? []
  const fixedSel = list.filter((f) => FIXED.has(f))
  const custom = list.filter((f) => !FIXED.has(f))
  return { fixedSel, custom }
}

export type InitialCabin = {
  id: string
  title: string
  description: string
  location_hub: string
  max_guests: number
  bedrooms: number
  facilities: string[] | null
  addon_services: unknown
  offers_transport: boolean
  transport_from: string | null
  transport_price_roundtrip_ore: number | null
}

interface Props {
  mode: "create" | "edit"
  initialCabin?: InitialCabin
}

export default function HytteForm({ mode, initialCabin }: Props) {
  const action = mode === "edit" ? updateHytte : createHytte
  const [state, formAction, isPending] = useActionState<HytteFormState, FormData>(
    action,
    null,
  )

  const { fixedSel: initFixed, custom: initCustom } = initialCabin
    ? splitFacilities(initialCabin.facilities)
    : { fixedSel: [], custom: [] }

  const [description, setDescription] = useState(initialCabin?.description ?? "")
  const [locationHub, setLocationHub] = useState(initialCabin?.location_hub ?? "")
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>(initFixed)
  const [customFacilities, setCustomFacilities] = useState<string[]>(initCustom)
  const [customInput, setCustomInput] = useState("")

  const [addonServices, setAddonServices] = useState<AddOnService[]>(() => {
    if (!initialCabin?.addon_services) return []
    if (Array.isArray(initialCabin.addon_services)) {
      return initialCabin.addon_services as AddOnService[]
    }
    return []
  })

  const [offersTransport, setOffersTransport] = useState(
    initialCabin?.offers_transport ?? false,
  )
  const [transportFrom, setTransportFrom] = useState(
    initialCabin?.transport_from ?? "",
  )
  const [transportPriceKr, setTransportPriceKr] = useState(
    initialCabin?.transport_price_roundtrip_ore != null
      ? String(Math.round(oreToKr(initialCabin.transport_price_roundtrip_ore)))
      : "",
  )

  useEffect(() => {
    if (initialCabin) {
      setDescription(initialCabin.description)
      setLocationHub(initialCabin.location_hub)
      const { fixedSel, custom } = splitFacilities(initialCabin.facilities)
      setSelectedFacilities(fixedSel)
      setCustomFacilities(custom)
      if (Array.isArray(initialCabin.addon_services)) {
        setAddonServices(initialCabin.addon_services as AddOnService[])
      }
      setOffersTransport(initialCabin.offers_transport)
      setTransportFrom(initialCabin.transport_from ?? "")
      setTransportPriceKr(
        initialCabin.transport_price_roundtrip_ore != null
          ? String(Math.round(oreToKr(initialCabin.transport_price_roundtrip_ore)))
          : "",
      )
    }
  }, [initialCabin])

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

  return (
    <form action={formAction} className="space-y-8">
      {mode === "edit" && initialCabin && (
        <input type="hidden" name="cabin_id" value={initialCabin.id} />
      )}

      <input type="hidden" name="location_hub" value={locationHub} />
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

      {/* 1. Titel */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-3">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Titel
        </p>
        <div>
          <Label htmlFor="title">
            Navn på hytten <span className="text-destructive">*</span>
          </Label>
          <Input
            id="title"
            name="title"
            maxLength={80}
            defaultValue={initialCabin?.title}
            placeholder="F.eks. Hytte ved fjorden i Nuuk"
            className="mt-1 rounded-xl"
            required
          />
          <FieldError messages={state?.errors?.title} />
        </div>
      </div>

      {/* 2. Beskrivelse */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-3">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Beskrivelse
        </p>
        <div>
          <Label htmlFor="description">
            Beskriv hytten <span className="text-destructive">*</span>
          </Label>
          <textarea
            id="description"
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            minLength={50}
            rows={5}
            placeholder="Beskriv hytten, omgivelserne og hvad gæster kan forvente (mindst 50 tegn)"
            className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
          />
          <div className="flex items-center justify-between mt-1">
            <FieldError messages={state?.errors?.description} />
            <span
              className={`text-xs ml-auto ${
                description.length < 50 ? "text-muted-foreground" : "text-green-600"
              }`}
            >
              {description.length} / 50+ tegn
            </span>
          </div>
        </div>
      </div>

      {/* 3. Destination */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-3">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Destination
        </p>
        <div>
          <Label>
            Nærmeste by <span className="text-destructive">*</span>
          </Label>
          <Select onValueChange={setLocationHub} value={locationHub} required>
            <SelectTrigger className="mt-1 rounded-xl">
              <SelectValue placeholder="Vælg destination" />
            </SelectTrigger>
            <SelectContent>
              {MAJOR_HUBS.map((loc) => (
                <SelectItem key={loc.postal_code} value={loc.name_dk}>
                  {loc.name_dk}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError messages={state?.errors?.location_hub} />
        </div>
      </div>

      {/* 4. Kapacitet */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-3">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Kapacitet
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="max_guests">
              Max gæster <span className="text-destructive">*</span>
            </Label>
            <Input
              id="max_guests"
              name="max_guests"
              type="number"
              min={1}
              max={30}
              defaultValue={initialCabin?.max_guests ?? 4}
              className="mt-1 rounded-xl"
            />
            <FieldError messages={state?.errors?.max_guests} />
          </div>
          <div>
            <Label htmlFor="bedrooms">
              Soverum <span className="text-destructive">*</span>
            </Label>
            <Input
              id="bedrooms"
              name="bedrooms"
              type="number"
              min={0}
              max={20}
              defaultValue={initialCabin?.bedrooms ?? 1}
              className="mt-1 rounded-xl"
            />
            <FieldError messages={state?.errors?.bedrooms} />
          </div>
        </div>
      </div>

      {/* 5. Faciliteter + Andet */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-5">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Faciliteter
        </p>
        {(Object.keys(CABIN_FACILITIES) as Array<keyof typeof CABIN_FACILITIES>).map(
          (sectionKey) => (
            <div key={String(sectionKey)}>
              <p className="text-xs font-semibold text-muted-foreground mb-2">
                {FACILITY_SECTION_LABELS[sectionKey]}
              </p>
              <div className="flex flex-wrap gap-2">
                {CABIN_FACILITIES[sectionKey].map((fac) => (
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
                    {fac.label}
                  </button>
                ))}
              </div>
            </div>
          ),
        )}

        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Andet</p>
          <p className="text-xs text-muted-foreground mb-2">
            Tilføj fritekst (komma eller Enter) — f.eks. solpanel, generator, sauna
          </p>
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
                  aria-label={`Fjern ${tag}`}
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
            placeholder="f.eks. Solpanel, Generator, Sauna"
            className="rounded-xl"
          />
        </div>
      </div>

      {/* 6. Tilvalgsydelser */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-3">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Tilvalgsydelser
        </p>
        <AddOnServicesEditor
          services={addonServices}
          onChange={setAddonServices}
          type="cabin"
        />
      </div>

      {/* 7. Billeder */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Billeder
        </p>
        <div className="rounded-xl border-2 border-dashed border-border bg-muted/30 py-10 flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <p className="text-sm">Billeder tilføjes i næste trin (Cloudinary)</p>
        </div>
      </div>

      {/* 8. Transport */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-4">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Transport
        </p>
        <div className="flex items-center gap-3">
          <Switch
            id="offers_transport_switch"
            checked={offersTransport}
            onCheckedChange={setOffersTransport}
          />
          <Label htmlFor="offers_transport_switch" className="cursor-pointer">
            Jeg tilbyder transport til hytten
          </Label>
        </div>

        {offersTransport && (
          <div className="space-y-4 pt-2">
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 space-y-2">
              <p>
                Prisen du angiver er for transport tur/retur pr. person.
              </p>
              <p>Gæster der kun vil én vej betaler 60% automatisk.</p>
            </div>
            <div>
              <Label htmlFor="transport_from">
                Transport fra (by/havn) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="transport_from"
                name="transport_from"
                value={transportFrom}
                onChange={(e) => setTransportFrom(e.target.value)}
                placeholder="F.eks. Nuuk havn"
                className="mt-1 rounded-xl"
              />
              <FieldError messages={state?.errors?.transport_from} />
            </div>
            <div>
              <Label htmlFor="transport_price_roundtrip_kr">
                Tur/retur pris pr. person (kr) <span className="text-destructive">*</span>
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
                Enkeltbilletpris:{" "}
                <span className="font-semibold text-foreground">
                  {singlePreviewKr.toLocaleString("da-DK")} kr.
                </span>{" "}
                <span className="text-xs">(60% — beregnes automatisk)</span>
              </p>
            )}
          </div>
        )}
      </div>

      {state?.errors?._form && (
        <p className="text-sm text-destructive">{state.errors._form[0]}</p>
      )}

      <Button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl h-12 text-base font-semibold"
      >
        {isPending
          ? "Gemmer…"
          : mode === "edit"
            ? "Gem ændringer"
            : "Gem hytte"}
      </Button>
    </form>
  )
}

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null
  return <p className="text-xs text-destructive mt-1">{messages[0]}</p>
}
