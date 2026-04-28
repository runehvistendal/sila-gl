"use client"

import { useState, useTransition } from "react"
import { Anchor, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { GREENLAND_LOCATIONS } from "@/lib/greenlandLocations"
import { opretSamsejlads } from "./actions"

const HUBS = GREENLAND_LOCATIONS.filter((l) => l.is_major_hub)
const ALL_LOCATIONS = [...HUBS, ...GREENLAND_LOCATIONS.filter((l) => !l.is_major_hub)]
const TODAY = new Date().toISOString().slice(0, 10)

export default function OpretForm() {
  const [errorMsg, setErrorMsg] = useState("")
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrorMsg("")
    const data = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await opretSamsejlads(data)
      if (result?.error) setErrorMsg(result.error)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Route */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Fra</label>
          <select
            name="from_location"
            required
            className="w-full text-sm bg-muted rounded-xl px-3 py-2.5 border border-border focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Vælg afgangssted</option>
            <optgroup label="Større byer">
              {HUBS.map((l) => (
                <option key={l.postal_code} value={l.name_dk}>{l.name_dk}</option>
              ))}
            </optgroup>
            <optgroup label="Øvrige steder">
              {GREENLAND_LOCATIONS.filter((l) => !l.is_major_hub).map((l) => (
                <option key={l.postal_code} value={l.name_dk}>{l.name_dk}</option>
              ))}
            </optgroup>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Til</label>
          <select
            name="to_location"
            required
            className="w-full text-sm bg-muted rounded-xl px-3 py-2.5 border border-border focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Vælg destination</option>
            <optgroup label="Større byer">
              {HUBS.map((l) => (
                <option key={l.postal_code} value={l.name_dk}>{l.name_dk}</option>
              ))}
            </optgroup>
            <optgroup label="Øvrige steder">
              {GREENLAND_LOCATIONS.filter((l) => !l.is_major_hub).map((l) => (
                <option key={l.postal_code} value={l.name_dk}>{l.name_dk}</option>
              ))}
            </optgroup>
          </select>
        </div>
      </div>

      {/* Date + time */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Afgangsdato</label>
          <input
            type="date"
            name="departure_date"
            required
            min={TODAY}
            className="w-full text-sm bg-muted rounded-xl px-3 py-2.5 border border-border focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Afgangstime</label>
          <input
            type="time"
            name="departure_time"
            required
            defaultValue="08:00"
            className="w-full text-sm bg-muted rounded-xl px-3 py-2.5 border border-border focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      {/* Seats + price */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Antal pladser</label>
          <input
            type="number"
            name="total_seats"
            required
            min={1}
            max={20}
            defaultValue={4}
            className="w-full text-sm bg-muted rounded-xl px-3 py-2.5 border border-border focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Pris pr. plads (kr.)</label>
          <input
            type="number"
            name="price_per_seat_kr"
            required
            min={0}
            step={1}
            placeholder="f.eks. 500"
            className="w-full text-sm bg-muted rounded-xl px-3 py-2.5 border border-border focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      {/* Boat description */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Fartøjsbeskrivelse <span className="text-muted-foreground font-normal">(valgfrit)</span>
        </label>
        <input
          type="text"
          name="boat_description"
          maxLength={200}
          placeholder="f.eks. Sejlbåd 32 fod, plads til 6"
          className="w-full text-sm bg-muted rounded-xl px-3 py-2.5 border border-border focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Beskrivelse af turen <span className="text-muted-foreground font-normal">(valgfrit)</span>
        </label>
        <textarea
          name="description"
          rows={3}
          maxLength={1000}
          placeholder="Fortæl om ruten, hvad der er inkluderet, eventuelle stop..."
          className="w-full text-sm bg-muted rounded-xl px-3 py-2.5 border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
        />
      </div>

      {errorMsg && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-2.5">
          {errorMsg}
        </p>
      )}

      <Button
        type="submit"
        disabled={isPending}
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl gap-2"
      >
        {isPending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Opretter tur...
          </>
        ) : (
          <>
            <Anchor className="w-4 h-4" />
            Opret samsejladstur
          </>
        )}
      </Button>
    </form>
  )
}
