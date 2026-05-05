"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { Home, MapPin, Pencil, Trash2, Zap, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatKr } from "@/lib/money"
import { deleteHytte } from "./actions"

export interface Hytte {
  id: string
  title: string
  location_hub: string
  price_per_night_ore: number
  published: boolean
  instant_book: boolean
  access_type: string
  max_guests: number
  created_at: string
}

function DeleteButton({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()

  if (confirming) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">Sikker?</span>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            startTransition(() => {
              void deleteHytte(fd)
            })
          }}
        >
          <input type="hidden" name="id" value={id} />
          <Button
            type="submit"
            size="sm"
            disabled={isPending}
            className="rounded-lg h-7 px-2.5 text-xs bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            {isPending ? "…" : "Slet"}
          </Button>
        </form>
        <Button
          size="sm"
          variant="ghost"
          className="rounded-lg h-7 px-2.5 text-xs"
          onClick={() => setConfirming(false)}
        >
          Annuller
        </Button>
      </div>
    )
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      className="rounded-lg h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
      onClick={() => setConfirming(true)}
      title="Slet hytte"
    >
      <Trash2 size={14} />
    </Button>
  )
}

const ACCESS_LABELS: Record<string, string> = {
  road:       "Vej",
  boat:       "Båd",
  helicopter: "Helikopter",
  other:      "Andet",
}

const HUB_GRADIENTS = [
  "linear-gradient(135deg, hsl(210 50% 82%) 0%, hsl(213 60% 50%) 100%)",
  "linear-gradient(135deg, hsl(210 40% 80%) 0%, hsl(213 55% 44%) 100%)",
  "linear-gradient(135deg, hsl(200 45% 83%) 0%, hsl(210 58% 47%) 100%)",
  "linear-gradient(135deg, hsl(205 50% 81%) 0%, hsl(215 62% 42%) 100%)",
]

function cabinGradient(id: string) {
  const idx =
    parseInt(id.replace(/\D/g, "").slice(-1) || "0", 10) % HUB_GRADIENTS.length
  return HUB_GRADIENTS[idx]
}

export default function MineHytterList({ cabins }: { cabins: Hytte[] }) {
  if (cabins.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card py-20 text-center">
        <div
          className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{ background: HUB_GRADIENTS[0] }}
        >
          <Home size={28} className="text-white" />
        </div>
        <p className="mb-1 font-semibold text-foreground">
          Du har ingen hytter endnu
        </p>
        <p className="mb-6 text-sm text-muted-foreground">
          Opret din første hytte og begynd at modtage bookinger
        </p>
        <Link
          href="/opret"
          className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus size={15} />
          Opret ny hytte
        </Link>
      </div>
    )
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {cabins.map((cabin) => (
        <article
          key={cabin.id}
          className="overflow-hidden rounded-2xl border border-border bg-card shadow-card hover:shadow-card-hover transition-shadow"
        >
          {/* Image placeholder */}
          <div
            className="relative h-44"
            style={{ background: cabinGradient(cabin.id) }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <Home size={36} className="text-white/40" />
            </div>

            {/* Published badge */}
            <span
              className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold ${
                cabin.published
                  ? "bg-green-100 text-green-700"
                  : "bg-card/90 text-muted-foreground"
              }`}
            >
              {cabin.published ? "Aktiv" : "Kladde"}
            </span>

            {/* Instant Book badge */}
            {cabin.instant_book && (
              <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                <Zap size={10} />
                Instant Book
              </span>
            )}
          </div>

          {/* Content */}
          <div className="p-4">
            <p className="mb-1 truncate text-sm font-semibold text-foreground leading-snug">
              {cabin.title}
            </p>

            <p className="mb-3 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin size={11} className="shrink-0" />
              {cabin.location_hub}
              <span className="mx-1 text-border">·</span>
              {ACCESS_LABELS[cabin.access_type] ?? cabin.access_type}
              <span className="mx-1 text-border">·</span>
              maks {cabin.max_guests} gæster
            </p>

            <p className="text-sm font-semibold text-primary">
              {formatKr(cabin.price_per_night_ore)}
              <span className="text-xs font-normal text-muted-foreground"> / nat</span>
            </p>

            {/* Action row */}
            <div className="mt-4 flex items-center justify-between gap-2">
              <Link href={`/opret-hytte/${cabin.id}/rediger`} className="flex-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5 rounded-xl text-xs"
                >
                  <Pencil size={12} />
                  Rediger
                </Button>
              </Link>
              <DeleteButton id={cabin.id} />
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}
