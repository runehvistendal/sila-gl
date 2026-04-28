"use client"

import { useState, useTransition } from "react"
import { Anchor, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createTransportRequest, type TripType } from "./actions"

interface LocationOption {
  name: string
  isHub: boolean
}

interface Props {
  locations: LocationOption[]
}

const TRIP_TYPES: { value: TripType; label: string }[] = [
  { value: "one_way",    label: "Enkelttur" },
  { value: "round_trip", label: "Tur-retur" },
  { value: "return",     label: "Kun retur" },
]

export default function AnmodForm({ locations }: Props) {
  const [fromLoc,      setFromLoc]      = useState("")
  const [toLoc,        setToLoc]        = useState("")
  const [desiredDate,  setDesiredDate]  = useState("")
  const [returnDate,   setReturnDate]   = useState("")
  const [passengers,   setPassengers]   = useState(1)
  const [tripType,     setTripType]     = useState<TripType>("one_way")
  const [description,  setDescription]  = useState("")
  const [error,        setError]        = useState<string | null>(null)
  const [isPending,    startTransition] = useTransition()

  const today = new Date().toISOString().slice(0, 10)
  const needsReturn = tripType === "round_trip"

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!fromLoc || !toLoc) { setError("Vælg Fra og Til"); return }
    if (!desiredDate)        { setError("Vælg en dato");    return }

    startTransition(async () => {
      const result = await createTransportRequest({
        from_location:  fromLoc,
        to_location:    toLoc,
        desired_date:   desiredDate,
        num_passengers: passengers,
        trip_type:      tripType,
        return_date:    needsReturn ? returnDate : undefined,
        description:    description || undefined,
      })

      if ("error" in result) {
        setError(result.error)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Fra / Til */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="from">Fra</Label>
          <select
            id="from"
            value={fromLoc}
            onChange={(e) => { setFromLoc(e.target.value); if (e.target.value === toLoc) setToLoc("") }}
            required
            className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Vælg sted…</option>
            <optgroup label="Større byer">
              {locations.filter((l) => l.isHub).map((l) => (
                <option key={l.name} value={l.name}>{l.name}</option>
              ))}
            </optgroup>
            <optgroup label="Bygder og øvrige">
              {locations.filter((l) => !l.isHub).map((l) => (
                <option key={l.name} value={l.name}>{l.name}</option>
              ))}
            </optgroup>
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="to">Til</Label>
          <select
            id="to"
            value={toLoc}
            onChange={(e) => setToLoc(e.target.value)}
            required
            className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Vælg sted…</option>
            <optgroup label="Større byer">
              {locations.filter((l) => l.isHub && l.name !== fromLoc).map((l) => (
                <option key={l.name} value={l.name}>{l.name}</option>
              ))}
            </optgroup>
            <optgroup label="Bygder og øvrige">
              {locations.filter((l) => !l.isHub && l.name !== fromLoc).map((l) => (
                <option key={l.name} value={l.name}>{l.name}</option>
              ))}
            </optgroup>
          </select>
        </div>
      </div>

      {/* Tur-type */}
      <div className="space-y-1.5">
        <Label>Tur-type</Label>
        <div className="flex gap-2 flex-wrap">
          {TRIP_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTripType(t.value)}
              className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${
                tripType === t.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border text-foreground hover:border-primary/50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dato(er) */}
      <div className={`grid gap-4 ${needsReturn ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
        <div className="space-y-1.5">
          <Label htmlFor="date">
            {needsReturn ? "Udrejsedato" : "Ønsket dato"}
          </Label>
          <input
            id="date"
            type="date"
            min={today}
            value={desiredDate}
            onChange={(e) => setDesiredDate(e.target.value)}
            required
            className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {needsReturn && (
          <div className="space-y-1.5">
            <Label htmlFor="return-date">Returdato</Label>
            <input
              id="return-date"
              type="date"
              min={desiredDate || today}
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
              required={needsReturn}
              className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        )}
      </div>

      {/* Antal passagerer */}
      <div className="space-y-1.5">
        <Label htmlFor="passengers">Antal passagerer</Label>
        <input
          id="passengers"
          type="number"
          min={1}
          max={20}
          value={passengers}
          onChange={(e) => setPassengers(Number(e.target.value))}
          required
          className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Besked */}
      <div className="space-y-1.5">
        <Label htmlFor="description">
          Besked til sejlere <span className="text-muted-foreground font-normal">(valgfri)</span>
        </Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Beskriv evt. bagage, tidspræferencer eller andre ønsker…"
          rows={3}
          className="rounded-xl resize-none"
          maxLength={500}
        />
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-3">{error}</p>
      )}

      <Button
        type="submit"
        disabled={isPending}
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl gap-2 font-semibold"
        size="lg"
      >
        <Anchor className="w-4 h-4" />
        {isPending ? "Sender…" : "Send anmodning"}
        {!isPending && <ArrowRight className="w-4 h-4" />}
      </Button>
    </form>
  )
}
