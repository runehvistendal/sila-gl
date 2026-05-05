"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Anchor } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import {
  deleteCabin,
  deleteBoat,
  duplicateCabin,
  publishCabin,
  unpublishCabin,
} from "@/app/dashboard/actions"

export interface CabinRow {
  id: string
  title: string
  location_hub: string
  published: boolean
}

export interface BoatRow {
  id: string
  name: string
  boat_type: string | null
  capacity: number
}

interface Props {
  cabins: CabinRow[]
  boats: BoatRow[]
}

export default function OpretPageClient({ cabins, boats }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [pendingId, setPendingId] = useState<string | null>(null)

  function onHytteCardClick() {
    if (cabins.length === 0) router.push("/opret/hytte")
  }

  function onTransportCardClick() {
    if (boats.length === 0) router.push("/opret/baad")
  }

  function handlePublish(cabinId: string) {
    setPendingId(cabinId)
    startTransition(async () => {
      const res = await publishCabin(cabinId)
      setPendingId(null)
      if (res.error) toast.error(res.error)
      else { toast.success("Hytte publiceret"); router.refresh() }
    })
  }

  function handleUnpublish(cabinId: string) {
    setPendingId(cabinId)
    startTransition(async () => {
      const res = await unpublishCabin(cabinId)
      setPendingId(null)
      if (res.error) toast.error(res.error)
      else { toast.success("Hytte afpubliceret"); router.refresh() }
    })
  }

  function handleDuplicate(cabinId: string) {
    setPendingId(cabinId)
    startTransition(async () => {
      const res = await duplicateCabin(cabinId)
      setPendingId(null)
      if (res.error) toast.error(res.error)
      else { toast.success("Hytte duplikeret — rediger og publicér den nye"); router.refresh() }
    })
  }

  function handleDelete(cabinId: string) {
    setPendingId(cabinId)
    startTransition(async () => {
      const res = await deleteCabin(cabinId)
      setPendingId(null)
      if (res.error) toast.error(res.error)
      else { toast.success("Hytte slettet"); router.refresh() }
    })
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pt-10 pb-20">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-2">Hvad vil du tilbyde?</h1>
        <p className="text-sm text-muted-foreground">
          Vælg hvad du vil tilbyde rejsende i Grønland
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <button
          type="button"
          onClick={onHytteCardClick}
          className="text-left border-2 border-border rounded-2xl p-5 sm:p-6 bg-white flex flex-col gap-3 min-h-0 min-w-0 hover:border-primary/40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg shrink-0">
            🏠
          </div>
          <div>
            <h2 className="font-bold text-foreground">Udlej en hytte</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Tilbyd din hytte til rejsende
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={onTransportCardClick}
          className="text-left border-2 border-border rounded-2xl p-5 sm:p-6 bg-white flex flex-col gap-3 min-h-0 min-w-0 hover:border-primary/40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Anchor className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-bold text-foreground">Tilbyd transport</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Tilbyd pladser på din båd
            </p>
          </div>
        </button>
      </div>

      {cabins.length > 0 && (
        <section className="rounded-2xl border border-border bg-muted/20 p-4 sm:p-5 mb-6">
          <ul className="space-y-2 break-words">
            {cabins.map((c) => {
              const busy = isPending && pendingId === c.id
              return (
                <li
                  key={c.id}
                  className="flex flex-col gap-2 rounded-xl border border-border p-3 bg-white"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground break-words">{c.title}</p>
                    <p className="text-xs text-muted-foreground break-words">{c.location_hub}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      className={
                        c.published
                          ? "bg-green-100 text-green-800 border-0"
                          : "bg-gray-100 text-gray-600 border-0"
                      }
                    >
                      {c.published ? "Aktiv" : "Kladde"}
                    </Badge>
                    <div className="flex flex-wrap gap-2">
                      {/* Rediger */}
                      <Button asChild size="sm" variant="outline" className="rounded-lg text-xs h-8">
                        <Link href={`/opret/hytte/${c.id}/rediger`}>Rediger</Link>
                      </Button>
                      {/* Tilgængelighed */}
                      <Button asChild size="sm" variant="outline" className="rounded-lg text-xs h-8">
                        <Link href={`/opret/hytte/${c.id}/tilgaengelighed`}>Tilgængelighed</Link>
                      </Button>

                      {!c.published ? (
                        /* Kladde → Publicér */
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => handlePublish(c.id)}
                          className="rounded-lg text-xs h-8 border-green-300 text-green-700 hover:bg-green-50"
                        >
                          Publicér
                        </Button>
                      ) : (
                        /* Aktiv → Afpublicér (med AlertDialog) + Dupliker */
                        <>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={busy}
                                className="rounded-lg text-xs h-8 border-amber-300 text-amber-700 hover:bg-amber-50"
                              >
                                Afpublicér
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Afpublicér hytte?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Hytten bliver usynlig for gæster og kan ikke bookes. Eksisterende bookinger påvirkes ikke.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuller</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleUnpublish(c.id)}
                                  className="bg-amber-600 hover:bg-amber-700 text-white"
                                >
                                  Afpublicér
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busy}
                            onClick={() => handleDuplicate(c.id)}
                            className="rounded-lg text-xs h-8 text-muted-foreground"
                          >
                            Dupliker
                          </Button>
                        </>
                      )}

                      {/* Slet */}
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={async () => {
                          if (!confirm("Slet hytten? Den fjernes permanent efter 30 dage.")) return
                          handleDelete(c.id)
                        }}
                        className="rounded-lg text-xs h-8 text-destructive hover:bg-destructive/10"
                      >
                        Slet
                      </Button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
          <div className="pt-3 border-t border-border mt-3">
            <Link href="/opret/hytte" className="text-sm font-medium text-primary hover:underline">
              + Opret ny hytte
            </Link>
          </div>
        </section>
      )}

      {boats.length > 0 && (
        <section className="rounded-2xl border border-border bg-muted/20 p-4 sm:p-5">
          <ul className="space-y-2 break-words">
            {boats.map((b) => (
              <li
                key={b.id}
                className="flex flex-col gap-2 rounded-xl border border-border p-3 bg-white"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-foreground break-words">{b.name}</p>
                  <p className="text-xs text-muted-foreground break-words">
                    {b.boat_type ?? "Båd"} — {b.capacity} pladser
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="rounded-lg text-xs h-8"
                  >
                    <Link href={`/opret/baad/${b.id}/rediger`}>Rediger</Link>
                  </Button>
                  <Button asChild size="sm" className="rounded-lg text-xs h-8">
                    <Link href={`/opret/opslag/sejlads/${b.id}`}>Post tur</Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      if (!confirm("Slet båden? Den fjernes permanent efter 30 dage.")) return
                      const res = await deleteBoat(b.id)
                      if (res.error) toast.error(res.error)
                      else { toast.success("Båd slettet"); router.refresh() }
                    }}
                    className="rounded-lg text-xs h-8 text-destructive hover:bg-destructive/10"
                  >
                    Slet
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          <div className="pt-3 border-t border-border mt-3">
            <Link href="/opret/baad" className="text-sm font-medium text-primary hover:underline">
              + Opret ny båd
            </Link>
          </div>
        </section>
      )}
    </div>
  )
}
