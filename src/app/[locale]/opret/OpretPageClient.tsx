"use client"

import { useState, useTransition, useEffect, useRef } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Anchor } from "lucide-react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
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
} from "@/app/[locale]/dashboard/actions"
import { publishedCabinDetailPath } from "@/lib/cabinPublicPaths"
import { captureEvent } from "@/lib/analytics/posthog-events"

export interface CabinRow {
  id: string
  title: string
  location_hub: string
  published: boolean
  property_type: string | null
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
  const t = useTranslations("create")
  const tCommon = useTranslations("common")
  const tDash = useTranslations("dashboard")
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const phBoat = useRef(false)

  useEffect(() => {
    if (phBoat.current) return
    const bid = searchParams.get("boat_created")
    if (!bid) return
    phBoat.current = true
    captureEvent("boat_created", { boat_id: bid })
    const sp = new URLSearchParams(searchParams.toString())
    sp.delete("boat_created")
    const qs = sp.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [searchParams, router, pathname])

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
      else {
        const c = cabins.find((x) => x.id === cabinId)
        if (c) {
          captureEvent("cabin_published", { cabin_id: c.id, location: c.location_hub })
        }
        toast.success(t("cabin_published"))
        router.refresh()
      }
    })
  }

  function handleUnpublish(cabinId: string) {
    setPendingId(cabinId)
    startTransition(async () => {
      const res = await unpublishCabin(cabinId)
      setPendingId(null)
      if (res.error) toast.error(res.error)
      else {
        captureEvent("cabin_unpublished", { cabin_id: cabinId })
        toast.success(t("cabin_unpublished"))
        router.refresh()
      }
    })
  }

  function handleDuplicate(cabinId: string) {
    setPendingId(cabinId)
    startTransition(async () => {
      const res = await duplicateCabin(cabinId)
      setPendingId(null)
      if (res.error) toast.error(res.error)
      else { toast.success(t("cabin_duplicated")); router.refresh() }
    })
  }

  function handleDelete(cabinId: string) {
    setPendingId(cabinId)
    startTransition(async () => {
      const res = await deleteCabin(cabinId)
      setPendingId(null)
      if (res.error) toast.error(res.error)
      else { toast.success(t("cabin_deleted")); router.refresh() }
    })
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pt-10 pb-20">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-2">{t("offer_title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("offer_subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <button
          type="button"
          onClick={onHytteCardClick}
          className="text-left border-2 border-border rounded-2xl p-5 sm:p-6 bg-white flex flex-col gap-3 min-h-0 min-w-0 hover:border-primary/40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg shrink-0">
            🏠
          </div>
          <div>
            <h2 className="font-bold text-foreground">{t("cabin_card_title")}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t("cabin_card_subtitle")}
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => router.push("/opret/bolig")}
          className="text-left border-2 border-border rounded-2xl p-5 sm:p-6 bg-white flex flex-col gap-3 min-h-0 min-w-0 hover:border-primary/40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg shrink-0">
            🏢
          </div>
          <div>
            <h2 className="font-bold text-foreground">{t("residence_card_title")}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t("residence_card_subtitle")}
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
            <h2 className="font-bold text-foreground">{t("boat_card_title")}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t("boat_card_subtitle")}
            </p>
          </div>
        </button>
      </div>

      {cabins.length > 0 && (
        <section className="rounded-2xl border border-border bg-muted/20 p-4 sm:p-5 mb-6">
          <ul className="space-y-2 break-words">
            {cabins.map((c) => {
              const busy = isPending && pendingId === c.id
              const isResidence = c.property_type === "residence"
              const publicPath = publishedCabinDetailPath(c.property_type, c.id)
              const editPath = isResidence
                ? `/opret/bolig/${c.id}/rediger`
                : `/opret/hytte/${c.id}/rediger`
              const availPath = isResidence
                ? `/opret/bolig/${c.id}/tilgaengelighed`
                : `/opret/hytte/${c.id}/tilgaengelighed`
              return (
                <li
                  key={c.id}
                  className="flex flex-col gap-2 rounded-xl border border-border p-3 bg-white"
                >
                  <Link
                    href={c.published ? publicPath : editPath}
                    className="min-w-0 group"
                  >
                    <p className="font-semibold text-foreground break-words group-hover:underline">{c.title}</p>
                    <p className="text-xs text-muted-foreground break-words">{c.location_hub}</p>
                  </Link>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="border-0 bg-primary/10 text-foreground">
                      {isResidence ? tDash("listing_badge_residence") : tDash("listing_badge_cabin")}
                    </Badge>
                    <Badge
                      className={
                        c.published
                          ? "bg-green-100 text-green-800 border-0"
                          : "bg-gray-100 text-gray-600 border-0"
                      }
                    >
                      {c.published ? tCommon("active") : tCommon("draft")}
                    </Badge>
                    <div className="flex flex-wrap gap-2">
                      <Button asChild size="sm" variant="outline" className="rounded-lg text-xs h-8">
                        <Link href={editPath}>{tCommon("edit")}</Link>
                      </Button>
                      <Button asChild size="sm" variant="outline" className="rounded-lg text-xs h-8">
                        <Link href={availPath}>{t("availability")}</Link>
                      </Button>

                      {!c.published ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => handlePublish(c.id)}
                          className="rounded-lg text-xs h-8 border-green-300 text-green-700 hover:bg-green-50"
                        >
                          {tCommon("publish")}
                        </Button>
                      ) : (
                        <>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={busy}
                                className="rounded-lg text-xs h-8 border-amber-300 text-amber-700 hover:bg-amber-50"
                              >
                                {tCommon("unpublish")}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t("unpublish_dialog_title")}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t("unpublish_dialog_description")}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleUnpublish(c.id)}
                                  className="bg-amber-600 hover:bg-amber-700 text-white"
                                >
                                  {tCommon("unpublish")}
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
                            {tCommon("duplicate")}
                          </Button>
                        </>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={async () => {
                          if (!confirm(t("delete_cabin_confirm"))) return
                          handleDelete(c.id)
                        }}
                        className="rounded-lg text-xs h-8 text-destructive hover:bg-destructive/10"
                      >
                        {tCommon("delete")}
                      </Button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
          <div className="pt-3 border-t border-border mt-3 flex flex-col sm:flex-row gap-3 sm:gap-6">
            <Link href="/opret/hytte" className="text-sm font-medium text-primary hover:underline">
              {t("add_new_cabin")}
            </Link>
            <Link href="/opret/bolig" className="text-sm font-medium text-primary hover:underline">
              {t("add_new_residence")}
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
                    {b.boat_type ?? t("boat_fallback_type")} — {b.capacity} {tCommon("seats")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="rounded-lg text-xs h-8"
                  >
                    <Link href={`/opret/baad/${b.id}/rediger`}>{tCommon("edit")}</Link>
                  </Button>
                  <Button asChild size="sm" className="rounded-lg text-xs h-8">
                    <Link href={`/opret/opslag/sejlads/${b.id}`}>{t("post_trip")}</Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      if (!confirm(t("delete_boat_confirm"))) return
                      const res = await deleteBoat(b.id)
                      if (res.error) toast.error(res.error)
                      else { toast.success(t("boat_deleted")); router.refresh() }
                    }}
                    className="rounded-lg text-xs h-8 text-destructive hover:bg-destructive/10"
                  >
                    {tCommon("delete")}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          <div className="pt-3 border-t border-border mt-3">
            <Link href="/opret/baad" className="text-sm font-medium text-primary hover:underline">
              {t("add_new_boat")}
            </Link>
          </div>
        </section>
      )}
    </div>
  )
}
