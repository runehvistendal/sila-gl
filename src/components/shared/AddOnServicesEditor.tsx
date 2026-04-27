"use client"

import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { oreToKr, krToOre } from "@/lib/money"

export type AddOnService = {
  name: string
  description?: string
  price_ore: number
}

const CABIN_SUGGESTIONS = [
  { name: "Slutrengøring",   description: "Professionel rengøring ved afrejse" },
  { name: "Brænde",          description: "Levering af brænde til brændeovn" },
  { name: "Indkøbspakke",    description: "Basale dagligvarer klar ved ankomst" },
  { name: "Morgenmadskurv",  description: "Hjemmelavet morgenmad første morgen" },
  { name: "Udstyrsleje",     description: "Udstyr til aktiviteter (kajak, fiskegrej m.m.)" },
]

const TRANSPORT_SUGGESTIONS = [
  { name: "Fiskestænger",      description: "Leje af fiskestænger og grej" },
  { name: "Måltid ombord",     description: "Varm mad eller snacks inkluderet" },
  { name: "Kikkertudlejning",  description: "Udlån af kikkert til dyreobservation" },
]

interface Props {
  services: AddOnService[]
  onChange: (services: AddOnService[]) => void
  type: "cabin" | "transport"
}

export default function AddOnServicesEditor({ services, onChange, type }: Props) {
  const suggestions = type === "cabin" ? CABIN_SUGGESTIONS : TRANSPORT_SUGGESTIONS

  const [name,        setName]        = useState("")
  const [description, setDescription] = useState("")
  const [priceKr,     setPriceKr]     = useState("")

  function handleSuggestion(s: { name: string; description: string }) {
    setName(s.name)
    setDescription(s.description)
  }

  function handleAdd() {
    const price = parseFloat(priceKr)
    if (!name.trim() || isNaN(price) || price < 0) return
    onChange([...services, { name: name.trim(), description: description.trim() || undefined, price_ore: krToOre(price) }])
    setName("")
    setDescription("")
    setPriceKr("")
  }

  function handleRemove(idx: number) {
    onChange(services.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-4">
      {/* Existing services */}
      {services.length > 0 && (
        <div className="space-y-2">
          {services.map((s, i) => (
            <div key={i} className="flex items-center justify-between gap-3 bg-muted rounded-xl px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{s.name}</p>
                {s.description && (
                  <p className="text-xs text-muted-foreground truncate">{s.description}</p>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <p className="text-sm font-semibold text-primary">
                  {oreToKr(s.price_ore).toLocaleString("da-DK")} kr.
                </p>
                <button
                  type="button"
                  onClick={() => handleRemove(i)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Suggestions */}
      <div className="flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button
            key={s.name}
            type="button"
            onClick={() => handleSuggestion(s)}
            className="text-xs px-3 py-1.5 rounded-full border border-border bg-white hover:border-primary/40 hover:bg-primary/5 transition-colors"
          >
            + {s.name}
          </button>
        ))}
      </div>

      {/* Add form */}
      <div className="bg-muted/50 rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">Navn</label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="F.eks. Slutrengøring"
              className="rounded-xl"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">Pris (kr)</label>
            <Input
              type="number"
              min={0}
              step={1}
              value={priceKr}
              onChange={(e) => setPriceKr(e.target.value)}
              placeholder="500"
              className="rounded-xl"
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1">Beskrivelse (valgfri)</label>
          <Input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Kort beskrivelse af ydelsen"
            className="rounded-xl"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAdd}
          disabled={!name.trim() || !priceKr}
          className="gap-1.5 rounded-xl"
        >
          <Plus className="w-3.5 h-3.5" /> Tilføj ydelse
        </Button>
      </div>
    </div>
  )
}
