"use client"

import { useActionState, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import AddOnServicesEditor, {
  type AddOnService,
} from "@/components/shared/AddOnServicesEditor"
import { oreToKr } from "@/lib/money"
import { publishCabinListing, type PublishCabinState } from "./actions"

interface Props {
  cabin: {
    id: string
    title: string
    location_hub: string
    price_per_night_ore: number
    cleaning_fee_ore: number
  }
}

export default function HytteOpslagForm({ cabin }: Props) {
  const [state, action, isPending] = useActionState<PublishCabinState, FormData>(
    publishCabinListing,
    null
  )

  const today = new Date().toISOString().split("T")[0]
  const [checkIn, setCheckIn] = useState("")
  const [checkOut, setCheckOut] = useState("")
  const [services, setServices] = useState<AddOnService[]>([])

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="cabin_id" value={cabin.id} />
      <input
        type="hidden"
        name="addon_services_json"
        value={JSON.stringify(services)}
      />

      {state?.message && (
        <div className="bg-destructive/10 text-destructive text-sm rounded-xl px-4 py-3">
          {state.message}
        </div>
      )}

      {/* Datoer */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Udlejningsperiode
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="check_in"
              className="text-sm font-medium text-foreground block mb-1.5"
            >
              Check-in dato <span className="text-destructive">*</span>
            </label>
            <Input
              id="check_in"
              type="date"
              name="check_in"
              min={today}
              value={checkIn}
              onChange={(e) => {
                setCheckIn(e.target.value)
                if (checkOut && e.target.value >= checkOut) setCheckOut("")
              }}
              className="rounded-xl"
            />
            {state?.errors?.check_in && (
              <p className="text-xs text-destructive mt-1">
                {state.errors.check_in[0]}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="check_out"
              className="text-sm font-medium text-foreground block mb-1.5"
            >
              Check-out dato <span className="text-destructive">*</span>
            </label>
            <Input
              id="check_out"
              type="date"
              name="check_out"
              min={checkIn || today}
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              className="rounded-xl"
            />
            {state?.errors?.check_out && (
              <p className="text-xs text-destructive mt-1">
                {state.errors.check_out[0]}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Prisinfo (read-only) */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Prisinformation
        </p>
        <div className="flex flex-col gap-2 text-sm text-foreground">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Pris pr. nat</span>
            <span className="font-semibold">
              {oreToKr(cabin.price_per_night_ore).toLocaleString("da-DK")} kr.
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Rengøringsgebyr</span>
            <span className="font-semibold">
              {oreToKr(cabin.cleaning_fee_ore).toLocaleString("da-DK")} kr.
            </span>
          </div>
        </div>
      </div>

      {/* Tilvalgsydelser */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Tilvalgsydelser
        </p>
        <AddOnServicesEditor
          services={services}
          onChange={setServices}
          type="cabin"
        />
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl h-12 text-base font-semibold"
      >
        {isPending ? "Publicerer…" : "Publicer hytte"}
      </Button>
    </form>
  )
}
