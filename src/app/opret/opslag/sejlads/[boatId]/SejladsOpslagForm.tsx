"use client"

import { useActionState, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import AddOnServicesEditor, {
  type AddOnService,
} from "@/components/shared/AddOnServicesEditor"
import { GREENLAND_LOCATIONS } from "@/lib/greenlandLocations"
import { createSejladsOpslag, type CreateSejladsState } from "./actions"

interface Props {
  boat: {
    id: string
    name: string
    boat_type: string | null
    capacity: number
  }
}

const SORTED_LOCATIONS = [...GREENLAND_LOCATIONS].sort((a, b) =>
  a.name_dk.localeCompare(b.name_dk, "da")
)

export default function SejladsOpslagForm({ boat }: Props) {
  const [state, action, isPending] = useActionState<CreateSejladsState, FormData>(
    createSejladsOpslag,
    null
  )

  const today = new Date().toISOString().split("T")[0]

  const [fromLocation, setFromLocation] = useState("")
  const [toLocation, setToLocation] = useState("")
  const [priceRoundtrip, setPriceRoundtrip] = useState("")
  const [services, setServices] = useState<AddOnService[]>([])

  const singlePrice = priceRoundtrip
    ? Math.round(Number(priceRoundtrip) * 0.6)
    : null

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="boat_id" value={boat.id} />
      <input
        type="hidden"
        name="addon_services_json"
        value={JSON.stringify(services)}
      />

      {/* From location hidden + to location hidden inputs for server action */}
      <input type="hidden" name="from_location" value={fromLocation} />
      <input type="hidden" name="to_location" value={toLocation} />

      {state?.message && (
        <div className="bg-destructive/10 text-destructive text-sm rounded-xl px-4 py-3">
          {state.message}
        </div>
      )}

      {/* Boat info */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
        <p className="text-sm font-bold text-blue-900">{boat.name}</p>
        <p className="text-sm text-blue-700 mt-0.5">
          {boat.boat_type ?? "Båd"} — Kapacitet: {boat.capacity} pladser
        </p>
      </div>

      {/* Fra / Til */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Rute
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">
              Fra <span className="text-destructive">*</span>
            </label>
            <Select value={fromLocation} onValueChange={setFromLocation}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Vælg afgangssted" />
              </SelectTrigger>
              <SelectContent>
                {SORTED_LOCATIONS.map((loc) => (
                  <SelectItem key={`${loc.postal_code}-${loc.name_dk}`} value={loc.name_dk}>
                    {loc.name_dk}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {state?.errors?.from_location && (
              <p className="text-xs text-destructive mt-1">
                {state.errors.from_location[0]}
              </p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">
              Til <span className="text-destructive">*</span>
            </label>
            <Select value={toLocation} onValueChange={setToLocation}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Vælg destination" />
              </SelectTrigger>
              <SelectContent>
                {SORTED_LOCATIONS.map((loc) => (
                  <SelectItem key={`${loc.postal_code}-${loc.name_dk}`} value={loc.name_dk}>
                    {loc.name_dk}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {state?.errors?.to_location && (
              <p className="text-xs text-destructive mt-1">
                {state.errors.to_location[0]}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Afgang */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Afgang
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="departure_date"
              className="text-sm font-medium text-foreground block mb-1.5"
            >
              Afgangsdato <span className="text-destructive">*</span>
            </label>
            <Input
              id="departure_date"
              type="date"
              name="departure_date"
              min={today}
              className="rounded-xl"
            />
            {state?.errors?.departure_date && (
              <p className="text-xs text-destructive mt-1">
                {state.errors.departure_date[0]}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="departure_time"
              className="text-sm font-medium text-foreground block mb-1.5"
            >
              Afgangstid{" "}
              <span className="text-muted-foreground font-normal">(valgfri)</span>
            </label>
            <Input
              id="departure_time"
              type="time"
              name="departure_time"
              className="rounded-xl"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="total_seats"
            className="text-sm font-medium text-foreground block mb-1.5"
          >
            Ledige pladser <span className="text-destructive">*</span>
          </label>
          <Input
            id="total_seats"
            type="number"
            name="total_seats"
            min={1}
            max={boat.capacity}
            placeholder={`Max ${boat.capacity}`}
            className="rounded-xl"
          />
          {state?.errors?.total_seats && (
            <p className="text-xs text-destructive mt-1">
              {state.errors.total_seats[0]}
            </p>
          )}
        </div>
      </div>

      {/* Pris */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Pris
        </p>

        <div>
          <label
            htmlFor="price_per_seat_roundtrip_kr"
            className="text-sm font-medium text-foreground block mb-1.5"
          >
            Tur/retur pris pr. plads (kr) <span className="text-destructive">*</span>
          </label>
          <Input
            id="price_per_seat_roundtrip_kr"
            type="number"
            name="price_per_seat_roundtrip_kr"
            min={1}
            step={1}
            placeholder="F.eks. 500"
            value={priceRoundtrip}
            onChange={(e) => setPriceRoundtrip(e.target.value)}
            className="rounded-xl"
          />
          {state?.errors?.price_per_seat_roundtrip_kr && (
            <p className="text-xs text-destructive mt-1">
              {state.errors.price_per_seat_roundtrip_kr[0]}
            </p>
          )}
          <p className="text-sm text-muted-foreground mt-2">
            Gæster vælger selv om de vil købe enkeltbillet eller returtur ved booking.
          </p>
        </div>

        {singlePrice !== null && priceRoundtrip !== "" && (
          <p className="text-sm text-muted-foreground bg-muted/50 rounded-xl px-4 py-3">
            Enkeltbilletpris:{" "}
            <span className="font-semibold text-foreground">
              {singlePrice.toLocaleString("da-DK")} kr.
            </span>{" "}
            <span className="text-xs">(60% — beregnes automatisk)</span>
          </p>
        )}
      </div>

      {/* Hjemrejse */}
      <div className="bg-muted/50 rounded-2xl p-5 space-y-4">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Hjemrejse
          </p>
          <p className="text-sm text-muted-foreground">
            Angiv hvornår I sejler tilbage
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Lad felterne stå tomme hvis du ikke tilbyder hjemrejse.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="return_date"
              className="text-sm font-medium text-foreground block mb-1.5"
            >
              Returdato
            </label>
            <Input
              id="return_date"
              type="date"
              name="return_date"
              className="rounded-xl bg-white"
            />
          </div>

          <div>
            <label
              htmlFor="return_time"
              className="text-sm font-medium text-foreground block mb-1.5"
            >
              Returtid
            </label>
            <Input
              id="return_time"
              type="time"
              name="return_time"
              className="rounded-xl bg-white"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="return_seats"
            className="text-sm font-medium text-foreground block mb-1.5"
          >
            Pladser retur
          </label>
          <Input
            id="return_seats"
            type="number"
            name="return_seats"
            min={1}
            max={boat.capacity}
            placeholder={`Max ${boat.capacity}`}
            className="rounded-xl bg-white"
          />
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
          type="transport"
        />
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl h-12 text-base font-semibold"
      >
        {isPending ? "Poster tur…" : "Post sejladstur"}
      </Button>
    </form>
  )
}
