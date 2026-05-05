"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { ChevronLeft, Home, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { GREENLAND_LOCATIONS } from "@/lib/greenlandLocations"
import { createCabinRequest } from "./actions"

const CITIES = [...new Set(GREENLAND_LOCATIONS.map((l) => l.name_dk))].sort()

export default function AnmodClient() {
  const t = useTranslations("request")
  const tCommon = useTranslations("common")
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await createCabinRequest(data)
      if (res?.error) {
        setError(res.error)
      }
    })
  }

  return (
    <main className="min-h-screen bg-background pt-16">
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-10">
        <Link
          href="/dashboard?tab=requests"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ChevronLeft className="w-4 h-4" /> {tCommon("back")}
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Home className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{t("title")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("subtitle")}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-white border border-border rounded-2xl p-6">

          {/* Destination */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              <MapPin className="w-3.5 h-3.5 inline mr-1 text-muted-foreground" />
              {t("destination")} <span className="text-destructive">*</span>
            </label>
            <select
              name="location"
              required
              className="w-full h-10 rounded-xl border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring text-foreground cursor-pointer"
            >
              <option value="">{t("select_city")}</option>
              {CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Datoer */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                {t("check_in")} <span className="text-destructive">*</span>
              </label>
              <Input
                type="date"
                name="desired_check_in"
                required
                min={new Date().toISOString().split("T")[0]}
                className="rounded-xl h-10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                {t("check_out")} <span className="text-destructive">*</span>
              </label>
              <Input
                type="date"
                name="desired_check_out"
                required
                min={new Date().toISOString().split("T")[0]}
                className="rounded-xl h-10"
              />
            </div>
          </div>

          {/* Gæster + budget */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                {t("guests")} <span className="text-destructive">*</span>
              </label>
              <Input
                type="number"
                name="num_guests"
                required
                min={1}
                max={20}
                defaultValue={2}
                className="rounded-xl h-10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                {t("budget_label")}
              </label>
              <Input
                type="number"
                name="max_price_kr"
                min={0}
                placeholder={tCommon("optional")}
                className="rounded-xl h-10"
              />
            </div>
          </div>

          {/* Beskrivelse */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              {t("description_label")}
            </label>
            <Textarea
              name="description"
              placeholder={t("description_placeholder")}
              rows={3}
              className="rounded-xl resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <Button
              type="submit"
              disabled={isPending}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-semibold"
            >
              {isPending ? tCommon("sending") : t("submit")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => router.back()}
            >
              {tCommon("cancel")}
            </Button>
          </div>
        </form>
      </div>
    </main>
  )
}
