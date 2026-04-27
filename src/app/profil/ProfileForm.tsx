"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  getAllLocationsSorted,
  locationToId,
  type GreenlandLocation,
} from "@/lib/greenlandLocations"
import { updateProfile } from "./actions"
import { Loader2 } from "lucide-react"
import AvatarUpload from "@/components/profile/AvatarUpload"

export type ProfileInitial = {
  full_name: string
  location_id: string | null
  language: "da" | "en" | "kl"
  role_type: "traveler" | "provider" | "both"
  avatar_url: string | null
}

const ROLE_LABEL: Record<ProfileInitial["role_type"], string> = {
  traveler: "Rejsende",
  provider: "Udbyder",
  both: "Begge",
}

const LOCATIONS: GreenlandLocation[] = getAllLocationsSorted()

const LANG_OPTIONS: { value: ProfileInitial["language"]; label: string }[] = [
  { value: "da", label: "Dansk" },
  { value: "en", label: "English" },
  { value: "kl", label: "Kalaallisut" },
]

export default function ProfileForm({ initial }: { initial: ProfileInitial }) {
  const [isPending, startTransition] = useTransition()
  const [locationId, setLocationId] = useState(initial.location_id ?? "__none__")
  const [language, setLanguage] = useState<ProfileInitial["language"]>(initial.language)
  const [fullName, setFullName] = useState(initial.full_name)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData()
    fd.set("full_name", fullName.trim())
    fd.set("location_id", locationId === "__none__" ? "" : locationId)
    fd.set("language", language)
    startTransition(async () => {
      const r = await updateProfile(fd)
      if ("error" in r) {
        toast.error(r.error)
        return
      }
      toast.success("Profil gemt")
    })
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-lg mx-auto flex flex-col gap-6 px-4 sm:px-0"
    >
      <AvatarUpload fullName={fullName} initialAvatarUrl={initial.avatar_url} />

      <div className="space-y-2">
        <label htmlFor="full_name" className="text-sm font-medium text-white">
          Navn
        </label>
        <Input
          id="full_name"
          name="full_name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          maxLength={120}
          autoComplete="name"
          className="rounded-xl border-white/20 bg-white/10 text-white placeholder:text-white/40 focus-visible:ring-[#4A9CC7]"
        />
      </div>

      <div className="space-y-2">
        <span className="text-sm font-medium text-white">By / sted</span>
        <Select
          value={locationId}
          onValueChange={setLocationId}
        >
          <SelectTrigger
            className="w-full rounded-xl border-white/20 bg-white/10 text-white h-11 data-[placeholder]:text-white/40"
          >
            <SelectValue placeholder="Vælg sted" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value="__none__">— Intet valgt —</SelectItem>
            {LOCATIONS.map((loc) => {
              const id = locationToId(loc)
              return (
                <SelectItem key={id} value={id}>
                  {loc.name_dk} ({loc.postal_code})
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <span className="text-sm font-medium text-white">Sprog</span>
        <Select
          value={language}
          onValueChange={(v) => setLanguage(v as ProfileInitial["language"])}
        >
          <SelectTrigger className="w-full rounded-xl border-white/20 bg-white/10 text-white h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LANG_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <span className="text-sm font-medium text-white">Rolle</span>
        <div>
          <Badge
            variant="secondary"
            className="rounded-full px-4 py-1.5 text-sm bg-white/15 text-white border border-white/20"
          >
            {ROLE_LABEL[initial.role_type]}
          </Badge>
          <p className="text-xs text-white/50 mt-2">
            Rollen sættes automatisk (fx når du opretter hytte eller båd).
          </p>
        </div>
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl text-white font-semibold h-12 border-0 hover:opacity-90"
        style={{ backgroundColor: "#4A9CC7" }}
      >
        {isPending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Gemmer…
          </>
        ) : (
          "Gem ændringer"
        )}
      </Button>
    </form>
  )
}
