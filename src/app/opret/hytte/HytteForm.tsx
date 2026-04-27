"use client"

import { useActionState, useState } from "react"
import { createHytte, type HytteFormState } from "./actions"
import { CABIN_FACILITIES, FACILITY_SECTION_LABELS } from "@/lib/cabinFacilities"
import { GREENLAND_LOCATIONS } from "@/lib/greenlandLocations"
import AddOnServicesEditor, { type AddOnService } from "@/components/shared/AddOnServicesEditor"
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

const ACCESS_TYPES = [
  { value: "road", label: "Vej" },
  { value: "boat", label: "Båd" },
  { value: "helicopter", label: "Helikopter" },
  { value: "other", label: "Andet" },
]

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null
  return (
    <p className="text-xs text-destructive mt-1">{messages[0]}</p>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
      {children}
    </p>
  )
}

export default function HytteForm() {
  const [state, action, isPending] = useActionState<HytteFormState, FormData>(
    createHytte,
    null,
  )

  const [description, setDescription] = useState("")
  const [locationHub, setLocationHub] = useState("")
  const [accessType, setAccessType] = useState("")
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([])
  const [addonServices, setAddonServices] = useState<AddOnService[]>([])
  const [offersTransport, setOffersTransport] = useState(false)
  const [transportPriceKr, setTransportPriceKr] = useState("")

  function toggleFacility(value: string) {
    setSelectedFacilities((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    )
  }

  const singleTicketPreview = transportPriceKr
    ? Math.round(Number(transportPriceKr) * 0.6)
    : null

  return (
    <form action={action} className="space-y-8">
      {/* Hidden controlled inputs */}
      <input type="hidden" name="location_hub" value={locationHub} />
      <input type="hidden" name="access_type" value={accessType} />
      {selectedFacilities.map((fac) => (
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
        <SectionHeading>Titel</SectionHeading>
        <div>
          <Label htmlFor="title">
            Navn på hytten <span className="text-destructive">*</span>
          </Label>
          <Input
            id="title"
            name="title"
            maxLength={80}
            placeholder="F.eks. Hytte ved fjorden i Nuuk"
            className="mt-1 rounded-xl"
          />
          <FieldError messages={state?.errors?.title} />
        </div>
      </div>

      {/* 2. Beskrivelse */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-3">
        <SectionHeading>Beskrivelse</SectionHeading>
        <div>
          <Label htmlFor="description">
            Beskriv hytten <span className="text-destructive">*</span>
          </Label>
          <textarea
            id="description"
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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
        <SectionHeading>Destination</SectionHeading>
        <div>
          <Label>
            Nærmeste by <span className="text-destructive">*</span>
          </Label>
          <Select onValueChange={setLocationHub} value={locationHub}>
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

      {/* 4. Max gæster + Soverum */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-3">
        <SectionHeading>Kapacitet</SectionHeading>
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
              placeholder="4"
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
              placeholder="2"
              className="mt-1 rounded-xl"
            />
            <FieldError messages={state?.errors?.bedrooms} />
          </div>
        </div>
      </div>

      {/* 5. Adgangstype */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-3">
        <SectionHeading>Adgangstype</SectionHeading>
        <div>
          <Label>
            Hvordan kommer man til hytten? <span className="text-destructive">*</span>
          </Label>
          <Select onValueChange={setAccessType} value={accessType}>
            <SelectTrigger className="mt-1 rounded-xl">
              <SelectValue placeholder="Vælg adgangstype" />
            </SelectTrigger>
            <SelectContent>
              {ACCESS_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError messages={state?.errors?.access_type} />
        </div>
      </div>

      {/* 6. Faciliteter */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-5">
        <SectionHeading>Faciliteter</SectionHeading>
        {(Object.keys(CABIN_FACILITIES) as Array<keyof typeof CABIN_FACILITIES>).map(
          (sectionKey) => (
            <div key={sectionKey}>
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
      </div>

      {/* 7. Tilvalgsydelser */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-3">
        <SectionHeading>Tilvalgsydelser</SectionHeading>
        <AddOnServicesEditor
          services={addonServices}
          onChange={setAddonServices}
          type="cabin"
        />
      </div>

      {/* 8. Billeder */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
        <SectionHeading>Billeder</SectionHeading>
        <div className="rounded-xl border-2 border-dashed border-border bg-muted/30 py-10 flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <p className="text-sm">Billeder tilføjes i næste trin (Cloudinary)</p>
        </div>
      </div>

      {/* 9. Transport */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-4">
        <SectionHeading>Transport</SectionHeading>
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
            <div>
              <Label htmlFor="transport_from">Transport fra (by/havn)</Label>
              <Input
                id="transport_from"
                name="transport_from"
                placeholder="F.eks. Nuuk havn"
                className="mt-1 rounded-xl"
              />
            </div>
            <div>
              <Label htmlFor="transport_price_roundtrip_kr">
                Tur/retur pris pr. person (kr)
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
            </div>
            {singleTicketPreview !== null && transportPriceKr !== "" && (
              <p className="text-sm text-muted-foreground bg-muted/50 rounded-xl px-4 py-3">
                Enkeltbilletpris:{" "}
                <span className="font-semibold text-foreground">
                  {singleTicketPreview} kr.
                </span>{" "}
                (60%)
              </p>
            )}
          </div>
        )}
      </div>

      {/* Form error */}
      {state?.errors?._form && (
        <p className="text-sm text-destructive">{state.errors._form[0]}</p>
      )}

      {/* 10. Submit */}
      <Button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl h-12 text-base font-semibold"
      >
        {isPending ? "Gemmer…" : "Gem hytte"}
      </Button>
    </form>
  )
}
