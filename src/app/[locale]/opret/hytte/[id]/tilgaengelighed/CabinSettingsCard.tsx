"use client"

import { useTransition, useState } from "react"
import { Loader2 } from "lucide-react"
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
import { toast } from "sonner"
import { saveCabinSettings } from "./actions"

interface Props {
  cabinId: string
  initialMinNights: number
  initialPreparationDays: number
}

export default function CabinSettingsCard({
  cabinId,
  initialMinNights,
  initialPreparationDays,
}: Props) {
  const [minNights, setMinNights] = useState(initialMinNights)
  const [preparationDays, setPreparationDays] = useState(initialPreparationDays)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    startTransition(async () => {
      const result = await saveCabinSettings(cabinId, minNights, preparationDays)
      if ("error" in result) {
        toast.error(result.error)
      } else {
        toast.success("Indstillinger gemt")
      }
    })
  }

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm p-6 mb-6">
      <h2 className="text-base font-semibold text-foreground mb-4">Bookingindstillinger</h2>

      <div className="flex flex-col gap-5">
        {/* Minimum nætter */}
        <div className="space-y-2">
          <Label htmlFor="min-nights" className="text-sm font-medium text-foreground">
            Minimum nætter
          </Label>
          <Input
            id="min-nights"
            type="number"
            min={1}
            max={30}
            value={minNights}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10)
              if (!isNaN(v)) setMinNights(v)
            }}
            className="rounded-xl h-11"
          />
          <p className="text-xs text-muted-foreground">
            Gæster skal booke minimum {minNights} {minNights === 1 ? "nat" : "nætter"}
          </p>
        </div>

        {/* Forberedelsestid */}
        <div className="space-y-2">
          <Label htmlFor="preparation-days" className="text-sm font-medium text-foreground">
            Forberedelsestid mellem bookinger
          </Label>
          <Select
            value={String(preparationDays)}
            onValueChange={(v) => setPreparationDays(Number(v))}
          >
            <SelectTrigger id="preparation-days" className="rounded-xl h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Ingen</SelectItem>
              <SelectItem value="1">1 dag</SelectItem>
              <SelectItem value="2">2 dage</SelectItem>
              <SelectItem value="3">3 dage</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Datoer blokeres automatisk efter en booking
          </p>
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={handleSave}
          disabled={isPending}
          className="rounded-xl h-10 px-5"
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            "Gem indstillinger"
          )}
        </Button>
      </div>
    </div>
  )
}
