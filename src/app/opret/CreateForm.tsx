"use client"

import { useActionState, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Home, Anchor } from "lucide-react"
import { createHytte, type CreateHytteState } from "./cabin-actions"
import { createSamsejlads, type CreateSamsejladsState } from "./transport-actions"
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

/* ── Shared data ── */
const MAJOR_HUBS = GREENLAND_LOCATIONS.filter((l) => l.is_major_hub)
const ALL_CITIES = GREENLAND_LOCATIONS.map((l) => l.name_dk).sort()

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

/* ── Shared UI helpers ── */
function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {hint && <p className="text-xs text-muted-foreground mb-2">{hint}</p>}
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

function FormError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
      {message}
    </div>
  )
}

/* ── Type selector ── */
const TYPE_OPTIONS = [
  {
    key: "cabin" as const,
    Icon: Home,
    label: "Hytte",
    desc: "Udlej din arktiske hytte",
  },
  {
    key: "transport" as const,
    Icon: Anchor,
    label: "Samsejlads",
    desc: "Tilbyd pladser på din båd",
  },
]

type FormType = "cabin" | "transport"

/* ── Cabin form ── */
function CabinForm({ state }: { state: CreateHytteState }) {
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
    <div className="space-y-6">
      <Field label="Hyttens titel" required>
        <Input
          name="title"
          maxLength={80}
          required
          placeholder="F.eks. Hytte ved Icefjord"
          className="rounded-xl min-h-[48px]"
        />
        <FieldError messages={state?.errors?.title} />
      </Field>

      <Field label="Beskrivelse" required>
        <Textarea
          name="beskrivelse"
          required
          minLength={50}
          rows={4}
          placeholder="Beskriv hytten, omgivelserne og oplevelsen (mindst 50 tegn)"
          className="rounded-xl resize-none"
        />
        <FieldError messages={state?.errors?.beskrivelse} />
      </Field>

      <Field label="Destination" required>
        <input type="hidden" name="location_hub" value={locationHub} />
        <Select value={locationHub} onValueChange={setLocationHub}>
          <SelectTrigger className="rounded-xl min-h-[48px] w-full">
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

      <div className="grid grid-cols-2 gap-4">
        <Field label="Max gæster" required>
          <Input name="max_guests" type="number" min={1} max={30} required defaultValue={2} className="rounded-xl min-h-[48px]" />
          <FieldError messages={state?.errors?.max_guests} />
        </Field>
        <Field label="Soverum">
          <Input name="bedrooms" type="number" min={0} max={20} required defaultValue={1} className="rounded-xl min-h-[48px]" />
          <FieldError messages={state?.errors?.bedrooms} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Pris pr. nat (kr)" required>
          <Input name="price_per_night_kr" type="number" min={1} step={1} required placeholder="750" className="rounded-xl min-h-[48px]" />
          <FieldError messages={state?.errors?.price_per_night_kr} />
        </Field>
        <Field label="Rengøringsgebyr (kr)">
          <Input name="cleaning_fee_kr" type="number" min={0} step={1} placeholder="0" className="rounded-xl min-h-[48px]" />
          <FieldError messages={state?.errors?.cleaning_fee_kr} />
        </Field>
      </div>

      <Field label="Adgang til hytten" required>
        <input type="hidden" name="access_type" value={accessType} />
        <Select value={accessType} onValueChange={setAccessType}>
          <SelectTrigger className="rounded-xl min-h-[48px] w-full">
            <SelectValue placeholder="Vælg adgangstype" />
          </SelectTrigger>
          <SelectContent>
            {ACCESS_TYPES.map(({ value, label }) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError messages={state?.errors?.access_type} />
      </Field>

      <div>
        <label className="block text-sm font-medium text-foreground mb-3">Faciliteter</label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {AMENITY_OPTIONS.map(({ value, label }) => (
            <label key={value} className="flex items-center gap-2.5 cursor-pointer">
              <Checkbox
                checked={amenities.includes(value)}
                onCheckedChange={(checked) => toggleAmenity(value, checked === true)}
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

      <div className="bg-muted/60 rounded-2xl p-5">
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="hidden" name="instant_book" value={instantBook ? "on" : ""} />
          <Switch checked={instantBook} onCheckedChange={setInstantBook} className="mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">Instant Book</p>
            <p className="text-xs text-muted-foreground mt-0.5">Gæster kan booke uden forudgående godkendelse</p>
          </div>
        </label>
      </div>

      <div className="bg-muted/60 rounded-2xl p-5 space-y-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="hidden" name="offers_transport" value={offersTransport ? "on" : ""} />
          <Switch checked={offersTransport} onCheckedChange={setOffersTransport} className="mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">Tilbyd transport til hytten</p>
            <p className="text-xs text-muted-foreground mt-0.5">Gæster vil se dit transporttilbud direkte på dit hytteopslag</p>
          </div>
        </label>

        {offersTransport && (
          <div className="pl-10">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 mb-4">
              <p className="text-sm text-blue-900">
                <strong>Prismodel:</strong> Prisen er for transport pr. person én vej.
              </p>
            </div>
            <Field label="Transportpris pr. person (kr)" required>
              <Input name="transport_price_kr" type="number" min={0} step={1} placeholder="250" className="rounded-xl min-h-[48px]" />
              <FieldError messages={state?.errors?.transport_price_kr} />
            </Field>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Transport form ── */
function TransportForm({ state }: { state: CreateSamsejladsState }) {
  const today = new Date().toISOString().split("T")[0]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Fra (afgangsby)" required>
          <select
            name="from_location"
            required
            defaultValue=""
            className="w-full min-h-[48px] px-3 rounded-xl border border-input bg-transparent text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="" disabled>Vælg by</option>
            {ALL_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <FieldError messages={state?.errors?.from_location} />
        </Field>

        <Field label="Til (ankomstby)" required>
          <select
            name="to_location"
            required
            defaultValue=""
            className="w-full min-h-[48px] px-3 rounded-xl border border-input bg-transparent text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="" disabled>Vælg by</option>
            {ALL_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <FieldError messages={state?.errors?.to_location} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Afgangsdato" required>
          <Input name="departure_date" type="date" required min={today} className="rounded-xl min-h-[48px]" />
          <FieldError messages={state?.errors?.departure_date} />
        </Field>
        <Field label="Afgangstid">
          <Input name="departure_time" type="time" className="rounded-xl min-h-[48px]" />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Ledige pladser" required>
          <Input
            name="total_seats"
            type="number"
            min={1}
            max={50}
            required
            placeholder="3"
            className="rounded-xl min-h-[48px]"
          />
          <FieldError messages={state?.errors?.total_seats} />
        </Field>
        <Field label="Pris pr. plads (kr)" required>
          <Input
            name="price_per_seat_kr"
            type="number"
            min={1}
            step={1}
            required
            placeholder="500"
            className="rounded-xl min-h-[48px]"
          />
          <FieldError messages={state?.errors?.price_per_seat_kr} />
        </Field>
      </div>

      <Field label="Bådtype / beskrivelse">
        <Input
          name="boat_description"
          placeholder="F.eks. Speedbåd, 6m, lukket kahyt"
          className="rounded-xl min-h-[48px]"
        />
        <FieldError messages={state?.errors?.boat_description} />
      </Field>

      <Field label="Noter til passagerer">
        <Textarea
          name="notes"
          rows={3}
          placeholder="Mødested, udstyr, øvrig praktisk info..."
          className="rounded-xl resize-none"
        />
      </Field>
    </div>
  )
}

/* ── Main component ── */
export default function CreateForm({ initialType }: { initialType: FormType }) {
  const router = useRouter()
  const [type, setType] = useState<FormType>(initialType)

  const [cabinState, cabinFormAction, cabinPending] = useActionState<CreateHytteState, FormData>(
    createHytte,
    null
  )
  const [transportState, transportFormAction, transportPending] =
    useActionState<CreateSamsejladsState, FormData>(createSamsejlads, null)

  function handleTypeChange(newType: FormType) {
    setType(newType)
    router.replace(`/opret?type=${newType}`, { scroll: false })
  }

  // Keep type in sync with URL on back/forward navigation
  useEffect(() => {
    setType(initialType)
  }, [initialType])

  return (
    <div>
      {/* ── Type selector — matches sila-2 CreateListing grid ── */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        {TYPE_OPTIONS.map(({ key, Icon, label, desc }) => (
          <button
            key={key}
            type="button"
            onClick={() => handleTypeChange(key)}
            className={`p-5 rounded-2xl border-2 text-left transition-all ${
              type === key
                ? "border-primary bg-primary/5"
                : "border-border bg-card hover:border-primary/30"
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl mb-3 flex items-center justify-center ${
                type === key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              <Icon size={20} />
            </div>
            <p className="font-semibold text-foreground text-sm">{label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
          </button>
        ))}
      </div>

      {/* ── Cabin form ── */}
      {type === "cabin" && (
        <form action={cabinFormAction} className="space-y-6">
          <FormError message={cabinState?.error} />
          <CabinForm state={cabinState} />
          <Button
            type="submit"
            disabled={cabinPending}
            className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-semibold text-base"
          >
            {cabinPending ? "Gemmer kladde…" : "Gem som kladde"}
          </Button>
        </form>
      )}

      {/* ── Transport form ── */}
      {type === "transport" && (
        <form action={transportFormAction} className="space-y-6">
          <FormError message={transportState?.error} />
          <TransportForm state={transportState} />
          <Button
            type="submit"
            disabled={transportPending}
            className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-semibold text-base"
          >
            {transportPending ? "Opretter samsejlads…" : "Opret samsejlads"}
          </Button>
        </form>
      )}
    </div>
  )
}
