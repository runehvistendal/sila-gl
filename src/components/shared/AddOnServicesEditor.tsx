"use client"

import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { krToOre } from "@/lib/money"
import { useTranslations } from "next-intl"
import { useFormatPrice } from "@/hooks/useFormatPrice"

export type AddOnService = {
  name: string
  description?: string
  price_ore: number
}

interface Props {
  services: AddOnService[]
  onChange: (services: AddOnService[]) => void
  type: "cabin" | "transport"
}

export default function AddOnServicesEditor({ services, onChange, type }: Props) {
  const t = useTranslations("cabins")
  const formatPrice = useFormatPrice()

  const CABIN_SUGGESTIONS = [
    { name: t("addon_cabin_cleaning"),   description: t("addon_cabin_cleaning_desc") },
    { name: t("addon_cabin_firewood"),   description: t("addon_cabin_firewood_desc") },
    { name: t("addon_cabin_grocery"),    description: t("addon_cabin_grocery_desc") },
    { name: t("addon_cabin_breakfast"),  description: t("addon_cabin_breakfast_desc") },
    { name: t("addon_cabin_equipment"),  description: t("addon_cabin_equipment_desc") },
  ]

  const TRANSPORT_SUGGESTIONS = [
    { name: t("addon_transport_fishing_rods"),   description: t("addon_transport_fishing_rods_desc") },
    { name: t("addon_transport_meal_onboard"),   description: t("addon_transport_meal_onboard_desc") },
    { name: t("addon_transport_binoculars"),     description: t("addon_transport_binoculars_desc") },
  ]

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
                  {formatPrice(s.price_ore)}
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
            <label className="text-xs font-semibold text-muted-foreground block mb-1">{t("addon_name_label")}</label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("addon_name_placeholder")}
              className="rounded-xl"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">{t("addon_price_label")}</label>
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
          <label className="text-xs font-semibold text-muted-foreground block mb-1">{t("addon_description_label")}</label>
          <Input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("addon_description_placeholder")}
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
          <Plus className="w-3.5 h-3.5" /> {t("addon_add_button")}
        </Button>
      </div>
    </div>
  )
}
