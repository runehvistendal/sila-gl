"use client"

import { useActionState, useState } from "react"
import { createHytte, type CreateHytteState } from "./actions"
import { GREENLAND_LOCATIONS } from "@/lib/greenlandLocations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"

const MAJOR_HUBS = GREENLAND_LOCATIONS.filter((l) => l.is_major_hub)

const ACCESS_TYPES = [
  { value: "road",       label: "Vej" },
  { value: "boat",       label: "Båd" },
  { value: "helicopter", label: "Helikopter" },
  { value: "other",      label: "Andet" },
]

const AMENITY_OPTIONS = [
  { value: "electricity",   label: "El" },
  { value: "water",         label: "Rindende vand" },
  { value: "wood_stove",    label: "Brændeovn" },
  { value: "toilet",        label: "Toilet" },
  { value: "sauna",         label: "Sauna" },
  { value: "boat_included", label: "Båd inkluderet" },
]

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null
  return (
    <p className="mt-1.5 text-sm text-destructive" role="alert">
      {messages[0]}
    </p>
  )
}

export default function CreateHytteForm() {
  const [state, formAction, pending] = useActionState<CreateHytteState, FormData>(
    createHytte,
    null
  )

  const [locationHub, setLocationHub] = useState("")
  const [accessType, setAccessType] = useState("")
  const [amenities, setAmenities] = useState<string[]>([])
  const [instantBook, setInstantBook] = useState(false)
  const [offersTransport, setOffersTransport] = useState(false)

  function toggleAmenity(value: string, checked: boolean) {
    setAmenities((prev) =>
      checked ? [...prev, value] : prev.filter((a) => a !== value)
    )
  }

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {state.error}
        </div>
      )}

      {/* 1. Titel */}
      <Field label="Hyttens titel" required>
        <Input
          id="title"
          name="title"
          maxLength={80}
          required
          placeholder="F.eks. Hytte ved Icefjord"
          className="rounded-xl min-h-[48px]"
          aria-describedby="title-error"
        />
        <FieldError messages={state?.errors?.title} />
      </Field>

      {/* 2. Beskrivelse */}
      <Field label="Beskrivelse" required>
        <Textarea
          id="beskrivelse"
          name="beskrivelse"
          required
          minLength={50}
          rows={4}
          placeholder="Beskriv hytten, omgivelserne og oplevelsen (mindst 50 tegn)"
          className="rounded-xl resize-none"
          aria-describedby="beskrivelse-error"
        />
        <FieldError messages={state?.errors?.beskrivelse} />
      </Field>

      {/* 3. Destination */}
      <Field label="Destination" required>
        <input type="hidden" name="location_hub" value={locationHub} />
        <Select value={locationHub} onValueChange={setLocationHub}>
          <SelectTrigger id="location_hub" className="rounded-xl min-h-[48px] w-full">
            <SelectValue placeholder="Vælg by" />
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
      </Field>

      {/* 4–5. Gæster og soverum */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Max gæster" required>
          <Input
            id="max_guests"
            name="max_guests"
            type="number"
            min={1}
            max={30}
            required
            defaultValue={2}
            className="rounded-xl min-h-[48px]"
          />
          <FieldError messages={state?.errors?.max_guests} />
        </Field>

        <Field label="Soverum">
          <Input
            id="bedrooms"
            name="bedrooms"
            type="number"
            min={0}
            max={20}
            required
            defaultValue={1}
            className="rounded-xl min-h-[48px]"
          />
          <FieldError messages={state?.errors?.bedrooms} />
        </Field>
      </div>

      {/* 6–7. Priser */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Pris pr. nat (kr)" required>
          <Input
            id="price_per_night_kr"
            name="price_per_night_kr"
            type="number"
            min={1}
            step={1}
            required
            placeholder="750"
            className="rounded-xl min-h-[48px]"
          />
          <FieldError messages={state?.errors?.price_per_night_kr} />
        </Field>

        <Field label="Rengøringsgebyr (kr)">
          <Input
            id="cleaning_fee_kr"
            name="cleaning_fee_kr"
            type="number"
            min={0}
            step={1}
            placeholder="0"
            className="rounded-xl min-h-[48px]"
          />
          <FieldError messages={state?.errors?.cleaning_fee_kr} />
        </Field>
      </div>

      {/* 8. Adgangstype */}
      <Field label="Adgang til hytten" required>
        <input type="hidden" name="access_type" value={accessType} />
        <Select value={accessType} onValueChange={setAccessType}>
          <SelectTrigger id="access_type" className="rounded-xl min-h-[48px] w-full">
            <SelectValue placeholder="Vælg adgangstype" />
          </SelectTrigger>
          <SelectContent>
            {ACCESS_TYPES.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError messages={state?.errors?.access_type} />
      </Field>

      {/* 9. Faciliteter */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Faciliteter
        </label>
        <p className="text-xs text-muted-foreground mb-3">
          Markér alle de faciliteter din hytte har
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {AMENITY_OPTIONS.map(({ value, label }) => (
            <label
              key={value}
              className="flex items-center gap-2.5 cursor-pointer"
            >
              <Checkbox
                id={`amenity-${value}`}
                checked={amenities.includes(value)}
                onCheckedChange={(checked) =>
                  toggleAmenity(value, checked === true)
                }
                className="h-5 w-5 rounded-md"
              />
              <span className="text-sm text-foreground">{label}</span>
            </label>
          ))}
        </div>
        {amenities.map((a) => (
          <input key={a} type="hidden" name="amenities" value={a} />
        ))}
      </div>

      {/* 10. Instant Book */}
      <div className="bg-muted/60 rounded-2xl p-5">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="hidden"
            name="instant_book"
            value={instantBook ? "on" : ""}
          />
          <Switch
            checked={instantBook}
            onCheckedChange={setInstantBook}
            className="mt-0.5"
            aria-label="Instant Book"
          />
          <div>
            <p className="text-sm font-semibold text-foreground">
              Instant Book
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Gæster kan booke uden forudgående godkendelse
            </p>
          </div>
        </label>
      </div>

      {/* 11–12. Transport */}
      <div className="bg-muted/60 rounded-2xl p-5 space-y-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="hidden"
            name="offers_transport"
            value={offersTransport ? "on" : ""}
          />
          <Switch
            checked={offersTransport}
            onCheckedChange={setOffersTransport}
            className="mt-0.5"
            aria-label="Tilbyd transport"
          />
          <div>
            <p className="text-sm font-semibold text-foreground">
              Tilbyd transport til hytten
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Gæster vil se dit transporttilbud direkte på dit hytteopslag
            </p>
          </div>
        </label>

        {offersTransport && (
          <div className="pl-10">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 mb-4">
              <p className="text-sm text-blue-900">
                <strong>Prismodel:</strong> Den pris du indtaster er for
                transport pr. person én vej.
              </p>
            </div>
            <Field label="Transportpris pr. person (kr)" required>
              <Input
                id="transport_price_kr"
                name="transport_price_kr"
                type="number"
                min={0}
                step={1}
                placeholder="250"
                className="rounded-xl min-h-[48px]"
              />
              <FieldError messages={state?.errors?.transport_price_kr} />
            </Field>
          </div>
        )}
      </div>

      {/* Submit */}
      <Button
        type="submit"
        disabled={pending}
        className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-semibold text-base"
      >
        {pending ? "Gemmer kladde…" : "Gem som kladde"}
      </Button>
    </form>
  )
}
