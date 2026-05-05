"use client"

import { useActionState, useState, useEffect } from "react"
import { createBaad, updateBaad, type BaadFormState } from "./actions"
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

const PREDEFINED = new Set([...COMFORT_CHIPS, ...EXTRA_CHIPS].map((c) => c.value))

function splitEquipment(equipment: string[] | null | undefined) {
  const list = equipment ?? []
  return {
    fixed: list.filter((e) => PREDEFINED.has(e)),
    custom: list.filter((e) => !PREDEFINED.has(e)),
  }
}

export type InitialBoat = {
  id: string
  name: string
  boat_type: string | null
  capacity: number
  description: string | null
  equipment: string[] | null
  addon_services: unknown
}

interface Props {
  mode: "create" | "edit"
  initialBoat?: InitialBoat
}

export default function BaadForm({ mode, initialBoat }: Props) {
  const action = mode === "edit" ? updateBaad : createBaad
  const [state, formAction, isPending] = useActionState<BaadFormState, FormData>(action, null)
  const [actionType, setActionType] = useState<"save" | "create_trip">("save")

  const { fixed: initFixed, custom: initCustom } = initialBoat
    ? splitEquipment(initialBoat.equipment)
    : { fixed: [], custom: [] }

  const [safetyConfirmed, setSafetyConfirmed] = useState(
    initialBoat ? true : false,
  )
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>(initFixed)
  const [customEquipment, setCustomEquipment] = useState<string[]>(initCustom)
  const [customInput, setCustomInput] = useState("")
  const [addonServices, setAddonServices] = useState<AddOnService[]>(() => {
    if (!initialBoat?.addon_services) return []
    if (Array.isArray(initialBoat.addon_services)) {
      return initialBoat.addon_services as AddOnService[]
    }
    return []
  })

  useEffect(() => {
    if (initialBoat) {
      const { fixed, custom } = splitEquipment(initialBoat.equipment)
      setSelectedEquipment(fixed)
      setCustomEquipment(custom)
      if (Array.isArray(initialBoat.addon_services)) {
        setAddonServices(initialBoat.addon_services as AddOnService[])
      }
      setSafetyConfirmed(true)
    }
  }, [initialBoat])

  function toggleEquipment(value: string) {
    setSelectedEquipment((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    )
  }

  function addCustomFromInput() {
    const parts = customInput
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (parts.length === 0) return
    setCustomEquipment((prev) => {
      const next = new Set([...prev, ...parts])
      return Array.from(next)
    })
    setCustomInput("")
  }

  function removeCustom(tag: string) {
    setCustomEquipment((prev) => prev.filter((t) => t !== tag))
  }

  const allEquipment = [...selectedEquipment, ...customEquipment]

  return (
    <form action={formAction} className="space-y-8">
      {mode === "edit" && initialBoat && (
        <input type="hidden" name="boat_id" value={initialBoat.id} />
      )}
      <input
        type="hidden"
        name="safety_confirmed"
        value={safetyConfirmed ? "on" : ""}
      />
      <input type="hidden" name="action_type" value={actionType} />
      {allEquipment.map((eq) => (
        <input key={eq} type="hidden" name="equipment" value={eq} />
      ))}
      <input
        type="hidden"
        name="addon_services_json"
        value={JSON.stringify(addonServices)}
      />

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

        {state?.errors?.safety_confirmed && (
          <p className="text-xs text-destructive mt-1">{state.errors.safety_confirmed[0]}</p>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-3">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Bådens navn
        </p>
        <div>
          <Label htmlFor="name">
            Navn <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            name="name"
            maxLength={80}
            defaultValue={initialBoat?.name}
            placeholder="F.eks. Nordstjernen"
            className="mt-1 rounded-xl"
            required
          />
          {state?.errors?.name && (
            <p className="text-xs text-destructive mt-1">{state.errors.name[0]}</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-3">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Bådtype
        </p>
        <div>
          <Label htmlFor="boat_type">Bådtype</Label>
          <Input
            id="boat_type"
            name="boat_type"
            defaultValue={initialBoat?.boat_type ?? ""}
            placeholder="Speedbåd, Fiskerbåd, Katamaran"
            className="mt-1 rounded-xl"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-3">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Kapacitet
        </p>
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
            defaultValue={initialBoat?.capacity}
            className="mt-1 rounded-xl"
            required
          />
          {state?.errors?.capacity && (
            <p className="text-xs text-destructive mt-1">{state.errors.capacity[0]}</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-3">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Beskrivelse
        </p>
        <div>
          <Label htmlFor="description">Beskriv båden (valgfri)</Label>
          <textarea
            id="description"
            name="description"
            defaultValue={initialBoat?.description ?? ""}
            rows={4}
            placeholder="Fortæl om båden, dens egenskaber og hvad gæster kan forvente"
            className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-5">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Udstyr
        </p>

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

        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Tilføj eget udstyr</p>
          <p className="text-xs text-muted-foreground mb-2">
            Komma eller Enter — tilføjer mærke med ×-knap
          </p>
          <div className="flex flex-wrap gap-2 mb-2 min-h-6">
            {customEquipment.map((tag) => (
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
            placeholder="Eget udstyr"
            className="rounded-xl"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-3">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Tilvalgsydelser
        </p>
        <AddOnServicesEditor
          services={addonServices}
          onChange={setAddonServices}
          type="transport"
        />
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Billeder
        </p>
        <div className="rounded-xl border-2 border-dashed border-border bg-muted/30 py-10 flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <p className="text-sm">Billeder tilføjes i næste trin (Cloudinary)</p>
        </div>
      </div>

      {state?.errors?._form && (
        <p className="text-sm text-destructive">{state.errors._form[0]}</p>
      )}

      {mode === "edit" ? (
        <Button
          type="submit"
          disabled={!safetyConfirmed || isPending}
          className="w-full rounded-xl h-12 text-base font-semibold"
        >
          {isPending ? "Gemmer…" : "Gem ændringer"}
        </Button>
      ) : (
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            type="submit"
            variant="outline"
            disabled={!safetyConfirmed || isPending}
            onClick={() => setActionType("save")}
            className="flex-1 rounded-xl h-12 text-base"
          >
            {isPending && actionType === "save" ? "Gemmer…" : "Gem båd"}
          </Button>
          <Button
            type="submit"
            disabled={!safetyConfirmed || isPending}
            onClick={() => setActionType("create_trip")}
            className="flex-1 rounded-xl h-12 text-base font-semibold"
            style={{ backgroundColor: "#4A9CC7" }}
          >
            {isPending && actionType === "create_trip" ? "Gemmer…" : "Gem og opret tur →"}
          </Button>
        </div>
      )}
    </form>
  )
}
