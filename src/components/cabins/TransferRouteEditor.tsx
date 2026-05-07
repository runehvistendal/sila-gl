"use client"

import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { TransferRoute, TransferTransportType } from "@/types/transfer"

export type { TransferRoute, TransferTransportType } from "@/types/transfer"

const TRANSPORT_OPTIONS: {
  value: TransferTransportType
  label: string
  icon: string
}[] = [
  { value: "boat", label: "Båd", icon: "🚤" },
  { value: "car", label: "Bil", icon: "🚗" },
  { value: "other", label: "Andet", icon: "✶" },
]

function krInputValue(ore: number): string {
  if (ore === 0) return ""
  const kr = ore / 100
  if (Number.isInteger(kr)) return String(kr)
  return String(kr)
}

function parseKrToOre(value: string): number {
  if (value.trim() === "" || value === "-") return 0
  const n = parseFloat(value)
  if (!Number.isFinite(n)) return 0
  return Math.round(n * 100)
}

function suggestedRoundtripOreFromOneWayOre(oneWayOre: number): number {
  const oneWayKr = oneWayOre / 100
  const roundTripKr = Math.round(oneWayKr * 1.8)
  return Math.round(roundTripKr * 100)
}

function routeRowKey(cabinId: string, route: TransferRoute, index: number): string {
  return route.id ?? `${cabinId}-route-${index}`
}

export interface TransferRouteEditorProps {
  cabinId: string
  initialRoutes: TransferRoute[]
  onChange: (routes: TransferRoute[]) => void
}

export default function TransferRouteEditor({
  cabinId,
  initialRoutes,
  onChange,
}: TransferRouteEditorProps) {
  function patchRoute(index: number, patch: Partial<TransferRoute>) {
    const next = initialRoutes.map((r, i) => (i === index ? { ...r, ...patch } : r))
    onChange(next)
  }

  function handleOneWayKrChange(index: number, value: string) {
    const oneWayOre = parseKrToOre(value)
    const roundtripOre = suggestedRoundtripOreFromOneWayOre(oneWayOre)
    patchRoute(index, {
      price_one_way_ore: oneWayOre,
      price_roundtrip_ore: roundtripOre,
    })
  }

  function handleRoundTripKrChange(index: number, value: string) {
    patchRoute(index, { price_roundtrip_ore: parseKrToOre(value) })
  }

  function removeRoute(index: number) {
    onChange(initialRoutes.filter((_, i) => i !== index))
  }

  function addRoute() {
    const nextOrder =
      initialRoutes.length === 0
        ? 0
        : Math.max(...initialRoutes.map((r) => r.sort_order), -1) + 1
    onChange([
      ...initialRoutes,
      {
        from_arrival_point: "",
        transport_type: "boat",
        price_one_way_ore: 0,
        price_roundtrip_ore: 0,
        max_guests: 4,
        description: "",
        sort_order: nextOrder,
      },
    ])
  }

  return (
    <div className="space-y-0 font-sans">
      {initialRoutes.map((route, index) => (
        <div key={routeRowKey(cabinId, route, index)}>
          {index > 0 && <hr className="my-6 border-border" />}
          <div className="space-y-4">
            <div className="w-full space-y-2">
              <Label htmlFor={`${cabinId}-arrival-${index}`} className="text-xs text-muted-foreground">
                Fra ankomstpunkt
              </Label>
              <Input
                id={`${cabinId}-arrival-${index}`}
                type="text"
                value={route.from_arrival_point}
                onChange={(e) => patchRoute(index, { from_arrival_point: e.target.value })}
                placeholder='fx "Nuuk Havn"'
                className="w-full rounded-xl"
              />
            </div>

            <div className="w-full space-y-2">
              <Label className="text-xs text-muted-foreground">Transportform</Label>
              <Select
                value={route.transport_type}
                onValueChange={(v) =>
                  patchRoute(index, { transport_type: v as TransferTransportType })
                }
              >
                <SelectTrigger className="w-full rounded-xl sm:max-w-md" size="default">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRANSPORT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="flex items-center gap-2">
                        <span aria-hidden>{opt.icon}</span>
                        <span>{opt.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="w-full space-y-2">
                <Label htmlFor={`${cabinId}-oneway-${index}`} className="text-xs text-muted-foreground">
                  Pris enkelttur (kr)
                </Label>
                <Input
                  id={`${cabinId}-oneway-${index}`}
                  type="text"
                  inputMode="decimal"
                  value={krInputValue(route.price_one_way_ore)}
                  onChange={(e) => handleOneWayKrChange(index, e.target.value)}
                  placeholder="0"
                  className="w-full rounded-xl"
                />
              </div>
              <div className="w-full space-y-2">
                <Label htmlFor={`${cabinId}-round-${index}`} className="text-xs text-muted-foreground">
                  Pris tur/retur (kr)
                </Label>
                <Input
                  id={`${cabinId}-round-${index}`}
                  type="text"
                  inputMode="decimal"
                  value={krInputValue(route.price_roundtrip_ore)}
                  onChange={(e) => handleRoundTripKrChange(index, e.target.value)}
                  placeholder="0"
                  className="w-full rounded-xl"
                />
              </div>
            </div>

            <div className="w-full space-y-2 sm:max-w-xs">
              <Label htmlFor={`${cabinId}-guests-${index}`} className="text-xs text-muted-foreground">
                Maks. gæster
              </Label>
              <Input
                id={`${cabinId}-guests-${index}`}
                type="number"
                min={1}
                step={1}
                value={route.max_guests}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10)
                  patchRoute(index, { max_guests: Number.isFinite(n) && n >= 1 ? n : 1 })
                }}
                className="w-full rounded-xl"
              />
            </div>

            <div className="w-full space-y-2">
              <Label htmlFor={`${cabinId}-desc-${index}`} className="text-xs text-muted-foreground">
                Beskrivelse til gæsten
              </Label>
              <Textarea
                id={`${cabinId}-desc-${index}`}
                value={route.description}
                onChange={(e) => patchRoute(index, { description: e.target.value })}
                placeholder="Hvor mødes I, hvad er inkluderet, …"
                className={cn("min-h-20 w-full rounded-xl resize-y")}
              />
            </div>

            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="w-full rounded-xl sm:w-auto"
              onClick={() => removeRoute(index)}
            >
              Slet rute
            </Button>
          </div>
        </div>
      ))}

      <div className={cn(initialRoutes.length > 0 ? "mt-6 pt-2" : "pt-0")}>
        <Button
          type="button"
          variant="outline"
          className="w-full gap-1.5 rounded-xl sm:w-auto"
          onClick={addRoute}
        >
          <Plus className="size-3.5" />
          Tilføj transferrute
        </Button>
      </div>
    </div>
  )
}
