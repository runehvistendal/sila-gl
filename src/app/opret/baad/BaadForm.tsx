"use client"

import { useActionState, useState } from "react"
import { createBaad, type BaadFormState } from "./actions"
import AddOnServicesEditor, { type AddOnService } from "@/components/shared/AddOnServicesEditor"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const COMFORT_CHIPS = [
  { value: "cabin", label: "Kabine/overnatning" },
  { value: "toilet", label: "Toilet om bord" },
  { value: "kitchen", label: "Køkken/kogemulighed" },
  { value: "heater", label: "Varmeapparat" },
  { value: "dinghy", label: "Gummibåd om bord" },
]

const EXTRA_CHIPS = [
  { value: "fishing_gear", label: "Fiskegrej" },
  { value: "binoculars", label: "Kikkert" },
]

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null
  return <p className="text-xs text-destructive mt-1">{messages[0]}</p>
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
      {children}
    </p>
  )
}

export default function BaadForm() {
  const [state, action, isPending] = useActionState<BaadFormState, FormData>(
    createBaad,
    null,
  )

  const [safetyConfirmed, setSafetyConfirmed] = useState(false)
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([])
  const [addonServices, setAddonServices] = useState<AddOnService[]>([])

  function toggleEquipment(value: string) {
    setSelectedEquipment((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    )
  }

  return (
    <form action={action} className="space-y-8">
      {/* Hidden controlled inputs */}
      <input
        type="hidden"
        name="safety_confirmed"
        value={safetyConfirmed ? "on" : ""}
      />
      {selectedEquipment.map((eq) => (
        <input key={eq} type="hidden" name="equipment" value={eq} />
      ))}
      <input
        type="hidden"
        name="addon_services_json"
        value={JSON.stringify(addonServices)}
      />

      {/* Safety info box */}
      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6 space-y-4">
        <div>
          <p className="text-sm font-semibold text-blue-900 mb-2">
            Alle både på Sila skal have følgende sikkerhedsudstyr om bord. Bekræft at din
            båd lever op til kravene.
          </p>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Redningsveste til alle</li>
            <li>Flare-sæt</li>
            <li>VHF-radio</li>
            <li>Førstehjælpskasse</li>
            <li>GPS</li>
          </ul>
        </div>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={safetyConfirmed}
            onChange={(e) => setSafetyConfirmed(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-primary"
          />
          <span className="text-sm text-blue-900 font-medium">
            Jeg bekræfter at min båd har alt ovenstående sikkerhedsudstyr
          </span>
        </label>

        <FieldError messages={state?.errors?.safety_confirmed} />
      </div>

      {/* 1. Bådens navn */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-3">
        <SectionHeading>Bådens navn</SectionHeading>
        <div>
          <Label htmlFor="name">
            Navn <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            name="name"
            maxLength={80}
            placeholder="F.eks. Nordstjernen"
            className="mt-1 rounded-xl"
          />
          <FieldError messages={state?.errors?.name} />
        </div>
      </div>

      {/* 2. Bådtype */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-3">
        <SectionHeading>Bådtype</SectionHeading>
        <div>
          <Label htmlFor="boat_type">Bådtype</Label>
          <Input
            id="boat_type"
            name="boat_type"
            placeholder="Speedbåd, Fiskerbåd, Katamaran"
            className="mt-1 rounded-xl"
          />
          <FieldError messages={state?.errors?.boat_type} />
        </div>
      </div>

      {/* 3. Kapacitet */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-3">
        <SectionHeading>Kapacitet</SectionHeading>
        <div>
          <Label htmlFor="capacity">
            Antal passagerer <span className="text-destructive">*</span>
          </Label>
          <Input
            id="capacity"
            name="capacity"
            type="number"
            min={1}
            max={50}
            placeholder="6"
            className="mt-1 rounded-xl"
          />
          <FieldError messages={state?.errors?.capacity} />
        </div>
      </div>

      {/* 4. Beskrivelse */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-3">
        <SectionHeading>Beskrivelse</SectionHeading>
        <div>
          <Label htmlFor="description">Beskriv båden (valgfri)</Label>
          <textarea
            id="description"
            name="description"
            rows={4}
            placeholder="Fortæl om båden, dens egenskaber og hvad gæster kan forvente"
            className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
          />
        </div>
      </div>

      {/* 5. Komfort chips */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-5">
        <SectionHeading>Udstyr</SectionHeading>

        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Komfort om bord</p>
          <div className="flex flex-wrap gap-2">
            {COMFORT_CHIPS.map((chip) => (
              <button
                key={chip.value}
                type="button"
                onClick={() => toggleEquipment(chip.value)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-all ${
                  selectedEquipment.includes(chip.value)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-white border-border hover:border-primary/40"
                }`}
              >
                {selectedEquipment.includes(chip.value) && <span>✓</span>}
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Ekstraudstyr</p>
          <div className="flex flex-wrap gap-2">
            {EXTRA_CHIPS.map((chip) => (
              <button
                key={chip.value}
                type="button"
                onClick={() => toggleEquipment(chip.value)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-all ${
                  selectedEquipment.includes(chip.value)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-white border-border hover:border-primary/40"
                }`}
              >
                {selectedEquipment.includes(chip.value) && <span>✓</span>}
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 6. Tilvalgsydelser */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-3">
        <SectionHeading>Tilvalgsydelser</SectionHeading>
        <AddOnServicesEditor
          services={addonServices}
          onChange={setAddonServices}
          type="transport"
        />
      </div>

      {/* 7. Billeder */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
        <SectionHeading>Billeder</SectionHeading>
        <div className="rounded-xl border-2 border-dashed border-border bg-muted/30 py-10 flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <p className="text-sm">Billeder tilføjes i næste trin (Cloudinary)</p>
        </div>
      </div>

      {/* Form error */}
      {state?.errors?._form && (
        <p className="text-sm text-destructive">{state.errors._form[0]}</p>
      )}

      {/* Submit */}
      <Button
        type="submit"
        disabled={!safetyConfirmed || isPending}
        className="w-full rounded-xl h-12 text-base font-semibold"
      >
        {isPending ? "Gemmer…" : "Gem båd"}
      </Button>
    </form>
  )
}
