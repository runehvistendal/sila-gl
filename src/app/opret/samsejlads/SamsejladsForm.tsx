"use client"

import { useActionState, useState } from "react"
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
import { GREENLAND_LOCATIONS } from "@/lib/greenlandLocations"
import { createSamsejlads, type SamsejladsFormState } from "./actions"

interface Boat {
  id: string
  name: string
  boat_type: string | null
  capacity: number
}

interface Props {
  boats: Boat[]
  defaultBoatId?: string
}

const SORTED_LOCATIONS = [...GREENLAND_LOCATIONS].sort((a, b) =>
  a.name_dk.localeCompare(b.name_dk, "da"),
)

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null
  return <p className="text-xs text-destructive mt-1">{messages[0]}</p>
}

export default function SamsejladsForm({ boats, defaultBoatId }: Props) {
  const [state, formAction, isPending] = useActionState<SamsejladsFormState, FormData>(
    createSamsejlads,
    null,
  )

  const [boatId, setBoatId] = useState(defaultBoatId ?? "")
  const [fromLocation, setFromLocation] = useState("")
  const [toLocation, setToLocation] = useState("")
  const [returtur, setReturtur] = useState(false)
  const [priceKr, setPriceKr] = useState("")

  const singlePreview =
    priceKr && !isNaN(Number(priceKr))
      ? Math.round(Number(priceKr) * 0.6)
      : null

  const today = new Date().toISOString().split("T")[0]

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="boat_id" value={boatId} />
      <input type="hidden" name="from_location" value={fromLocation} />
      <input type="hidden" name="to_location" value={toLocation} />

      {state?.errors?._form && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.errors._form[0]}
        </div>
      )}

      {/* Båd */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-3">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Båd
        </p>
        {boats.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Du har ingen registrerede både. <a href="/opret/baad" className="underline text-foreground">Registrér en båd</a> først.
          </p>
        ) : (
          <div>
            <Label>Vælg båd <span className="text-destructive">*</span></Label>
            <Select onValueChange={setBoatId} value={boatId} required>
              <SelectTrigger className="mt-1 rounded-xl">
                <SelectValue placeholder="Vælg din båd" />
              </SelectTrigger>
              <SelectContent>
                {boats.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                    {b.boat_type ? ` — ${b.boat_type}` : ""}
                    {` (${b.capacity} pladser)`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError messages={state?.errors?.boat_id} />
          </div>
        )}
      </div>

      {/* Rute */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-4">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Rute
        </p>
        <div>
          <Label>Fra <span className="text-destructive">*</span></Label>
          <Select onValueChange={setFromLocation} value={fromLocation} required>
            <SelectTrigger className="mt-1 rounded-xl">
              <SelectValue placeholder="Afgangsby" />
            </SelectTrigger>
            <SelectContent>
              {SORTED_LOCATIONS.map((l) => (
                <SelectItem key={l.postal_code} value={l.name_dk}>
                  {l.name_dk}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError messages={state?.errors?.from_location} />
        </div>

        <div>
          <Label>Til <span className="text-destructive">*</span></Label>
          <Select onValueChange={setToLocation} value={toLocation} required>
            <SelectTrigger className="mt-1 rounded-xl">
              <SelectValue placeholder="Ankomstby" />
            </SelectTrigger>
            <SelectContent>
              {SORTED_LOCATIONS.filter((l) => l.name_dk !== fromLocation).map((l) => (
                <SelectItem key={l.postal_code} value={l.name_dk}>
                  {l.name_dk}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError messages={state?.errors?.to_location} />
        </div>
      </div>

      {/* Afgang */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-4">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Afgang
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="afgang_dato">Dato <span className="text-destructive">*</span></Label>
            <Input
              id="afgang_dato"
              name="afgang_dato"
              type="date"
              min={today}
              className="mt-1 rounded-xl"
              required
            />
            <FieldError messages={state?.errors?.afgang_dato} />
          </div>
          <div>
            <Label htmlFor="afgang_tid">Tidspunkt <span className="text-destructive">*</span></Label>
            <Input
              id="afgang_tid"
              name="afgang_tid"
              type="time"
              className="mt-1 rounded-xl"
              required
            />
            <FieldError messages={state?.errors?.afgang_tid} />
          </div>
        </div>
      </div>

      {/* Pladser + pris */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-4">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Pladser og pris
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="total_pladser">Ledige pladser <span className="text-destructive">*</span></Label>
            <Input
              id="total_pladser"
              name="total_pladser"
              type="number"
              min={1}
              max={20}
              defaultValue={1}
              className="mt-1 rounded-xl"
              required
            />
            <FieldError messages={state?.errors?.total_pladser} />
          </div>
          <div>
            <Label htmlFor="pris_roundtrip_kr">Tur/retur pr. plads (kr) <span className="text-destructive">*</span></Label>
            <Input
              id="pris_roundtrip_kr"
              name="pris_roundtrip_kr"
              type="number"
              min={0}
              step={1}
              value={priceKr}
              onChange={(e) => setPriceKr(e.target.value)}
              placeholder="800"
              className="mt-1 rounded-xl"
              required
            />
            <FieldError messages={state?.errors?.pris_roundtrip_kr} />
          </div>
        </div>
        {singlePreview !== null && priceKr !== "" && (
          <p className="text-sm text-muted-foreground bg-muted/50 rounded-xl px-4 py-3">
            Enkeltbilletpris:{" "}
            <span className="font-semibold text-foreground">
              {singlePreview.toLocaleString("da-DK")} kr.
            </span>{" "}
            <span className="text-xs">(60% — beregnes automatisk)</span>
          </p>
        )}
      </div>

      {/* Beskrivelse */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-3">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Beskrivelse
        </p>
        <div>
          <Label htmlFor="beskrivelse">Om turen (valgfri)</Label>
          <textarea
            id="beskrivelse"
            name="beskrivelse"
            rows={3}
            placeholder="Fortæl om turen, evt. stop undervejs, vejrforhold o.l."
            className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
          />
        </div>
      </div>

      {/* Returtur */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-4">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Returtur
        </p>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="returtur"
            value="on"
            checked={returtur}
            onChange={(e) => setReturtur(e.target.checked)}
            className="w-4 h-4 accent-primary"
          />
          <span className="text-sm font-medium">Jeg tilbyder også returtur</span>
        </label>

        {returtur && (
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div>
              <Label htmlFor="retur_dato">Returdato <span className="text-destructive">*</span></Label>
              <Input
                id="retur_dato"
                name="retur_dato"
                type="date"
                min={today}
                className="mt-1 rounded-xl"
              />
              <FieldError messages={state?.errors?.retur_dato} />
            </div>
            <div>
              <Label htmlFor="retur_tid">Returtidspunkt <span className="text-destructive">*</span></Label>
              <Input
                id="retur_tid"
                name="retur_tid"
                type="time"
                className="mt-1 rounded-xl"
              />
              <FieldError messages={state?.errors?.retur_tid} />
            </div>
          </div>
        )}
      </div>

      <Button
        type="submit"
        disabled={isPending || boats.length === 0}
        className="w-full rounded-xl h-12 text-base font-semibold"
        style={{ backgroundColor: "#4A9CC7" }}
      >
        {isPending ? "Opretter tur…" : "Opret tur"}
      </Button>
    </form>
  )
}
