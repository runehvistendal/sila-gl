"use client"

import { useActionState, useState } from "react"
import LocationAutocomplete from "@/components/shared/LocationAutocomplete"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createOplevelse, type OplevelseFormState } from "./actions"
import { EXPERIENCE_FORM_CATEGORIES } from "./experienceFormCategories"

const CATEGORY_LABELS: Record<string, string> = {
  fiskeri: "Fiskeri",
  vandring: "Vandring",
  kajak: "Kajak",
  hundeslæde: "Hundeslæde",
  hvalsafari: "Hvalsafari",
  guidetur: "Guidetur",
  fotografering: "Fotografering",
  andet: "Andet",
}

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null
  return <p className="mt-1 text-xs text-destructive">{messages[0]}</p>
}

export default function OplevelsesForm() {
  const [state, formAction, isPending] = useActionState<OplevelseFormState, FormData>(
    createOplevelse,
    null,
  )

  const [locationHub, setLocationHub] = useState("")

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="location_hub" value={locationHub} />

      <div className="space-y-4 rounded-2xl border border-border bg-white p-6 shadow-sm">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Grundinfo
        </p>
        <div>
          <Label htmlFor="exp-title">
            Titel <span className="text-destructive">*</span>
          </Label>
          <Input
            id="exp-title"
            name="title"
            maxLength={80}
            required
            className="mt-1 rounded-xl"
            placeholder="Fx Nordlystur med guide"
          />
          <FieldError messages={state?.errors?.title} />
        </div>
        <div>
          <Label htmlFor="exp-description">
            Beskrivelse <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="exp-description"
            name="description"
            required
            minLength={50}
            rows={5}
            placeholder="Beskriv oplevelsen for gæster (mindst 50 tegn)…"
            className="mt-1 min-h-[120px] resize-y rounded-xl"
          />
          <FieldError messages={state?.errors?.description} />
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-border bg-white p-6 shadow-sm">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Sted og kategori
        </p>
        <div>
          <Label>
            Lokation <span className="text-destructive">*</span>
          </Label>
          <div className="mt-1">
            <LocationAutocomplete
              value={locationHub}
              onChange={setLocationHub}
              variant="default"
              showOptionMeta={false}
              placeholder="Søg efter sted"
              aria-label="Lokation"
            />
          </div>
          <FieldError messages={state?.errors?.location_hub} />
        </div>
        <div>
          <Label htmlFor="exp-category">
            Kategori <span className="text-destructive">*</span>
          </Label>
          <select
            id="exp-category"
            name="category"
            required
            className="mt-1 flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            defaultValue=""
          >
            <option value="" disabled>
              Vælg kategori
            </option>
            {EXPERIENCE_FORM_CATEGORIES.map((key) => (
              <option key={key} value={key}>
                {CATEGORY_LABELS[key]}
              </option>
            ))}
          </select>
          <FieldError messages={state?.errors?.category} />
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-border bg-white p-6 shadow-sm">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Praktisk
        </p>
        <div>
          <Label htmlFor="exp-duration-h">
            Varighed (timer) <span className="text-destructive">*</span>
          </Label>
          <Input
            id="exp-duration-h"
            name="duration_hours"
            type="number"
            min={0.5}
            step={0.5}
            required
            placeholder="Fx 2"
            className="mt-1 rounded-xl"
          />
          <FieldError messages={state?.errors?.duration_hours} />
        </div>
        <div>
          <Label htmlFor="exp-max-part">
            Max deltagere <span className="text-destructive">*</span>
          </Label>
          <Input
            id="exp-max-part"
            name="max_participants"
            type="number"
            min={1}
            max={50}
            defaultValue={8}
            required
            className="mt-1 rounded-xl"
          />
          <FieldError messages={state?.errors?.max_participants} />
        </div>
        <div>
          <Label htmlFor="exp-price-kr">
            Pris pr. person (kr) <span className="text-destructive">*</span>
          </Label>
          <Input
            id="exp-price-kr"
            name="price_per_person_kr"
            type="number"
            min={1}
            step={1}
            required
            placeholder="Fx 599"
            className="mt-1 rounded-xl"
          />
          <FieldError messages={state?.errors?.price_per_person_kr} />
        </div>
      </div>

      {(state?.error ?? state?.errors?._form?.[0]) && (
        <p className="text-sm text-destructive">{state?.error ?? state?.errors?._form?.[0]}</p>
      )}

      <Button
        type="submit"
        disabled={isPending}
        className="h-12 w-full rounded-xl text-base font-semibold text-white hover:opacity-95"
        style={{ backgroundColor: "#114788" }}
      >
        {isPending ? "Opretter…" : "Opret oplevelse →"}
      </Button>
    </form>
  )
}
