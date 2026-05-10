"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "@/i18n/navigation"
import { useLocale, useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { sendStayOffer } from "@/app/actions/stay-offers"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { krToOre, formatKr } from "@/lib/money"
import { toast } from "sonner"
import { ArrowLeft, MapPin, Calendar, Users, Banknote, Anchor } from "lucide-react"
import { format } from "date-fns"
import { da, enGB } from "date-fns/locale"

export type StayOfferCabinOption = {
  id: string
  title: string
  locationLabel: string
  price_per_night_ore: number
}

type Props = {
  stayRequestId: string
  stayLocation: string
  checkIn: string
  checkOut: string
  numGuests: number
  maxPriceOre: number | null
  description: string | null
  propertyType: string
  nights: number
  cabins: StayOfferCabinOption[]
  needsTransport?: boolean
}

function defaultPriceDkk(cabin: StayOfferCabinOption | undefined, nights: number): string {
  if (!cabin) return ""
  const ore = cabin.price_per_night_ore * Math.max(1, nights)
  return String(Math.round(ore / 100))
}

export function StayOfferForm({
  stayRequestId,
  stayLocation,
  checkIn,
  checkOut,
  numGuests,
  maxPriceOre,
  description,
  propertyType,
  nights,
  cabins,
  needsTransport = false,
}: Props) {
  const t = useTranslations("dashboard")
  const tReq = useTranslations("request")
  const router = useRouter()
  const locale = useLocale()
  const dateLocale = locale === "en" ? enGB : da
  const [selectedId, setSelectedId] = useState(cabins[0]?.id ?? "")
  const [priceInput, setPriceInput] = useState(() => defaultPriceDkk(cabins[0], nights))
  const [message, setMessage] = useState("")
  const [offerTransport, setOfferTransport] = useState(false)
  const [transportPriceInput, setTransportPriceInput] = useState("")
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const propertyBadge =
    propertyType === "residence"
      ? tReq("badge_residence")
      : propertyType === "any"
        ? tReq("badge_any")
        : tReq("badge_cabin")

  const selected = useMemo(
    () => cabins.find((c) => c.id === selectedId),
    [cabins, selectedId],
  )

  useEffect(() => {
    setPriceInput(defaultPriceDkk(selected, nights))
  }, [selected, nights])

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFieldError(null)
    const cabinId = selectedId
    if (!cabinId) {
      setFieldError(t("stay_offer_select_listing"))
      return
    }
    const kr = Number(priceInput.replace(",", ".").trim())
    if (!Number.isFinite(kr) || kr < 1) {
      setFieldError(t("stay_offer_price_invalid"))
      return
    }
    const ore = krToOre(kr)
    if (ore < 100) {
      setFieldError(t("stay_offer_price_invalid"))
      return
    }

    let transportOre = 0
    if (needsTransport && offerTransport) {
      const tKr = Number(transportPriceInput.replace(",", ".").trim())
      if (!Number.isFinite(tKr) || tKr < 1) {
        setFieldError(t("stay_offer_transport_price_invalid"))
        return
      }
      transportOre = krToOre(tKr)
      if (transportOre < 100) {
        setFieldError(t("stay_offer_transport_price_invalid"))
        return
      }
    }

    startTransition(async () => {
      const res = await sendStayOffer(stayRequestId, cabinId, ore, message, transportOre)
      if ("error" in res) {
        toast.error(res.error)
        return
      }
      toast.success(t("stay_offer_toast_success"))
      router.push(`/dashboard?tab=open-requests`)
    })
  }

  if (cabins.length === 0) {
    return (
      <div className="space-y-6">
        <Link
          href="/dashboard?tab=open-requests"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("stay_offer_back")}
        </Link>
        <div className="rounded-2xl border border-border bg-white p-6 shadow-sm space-y-3">
          <p className="text-sm text-muted-foreground">{t("stay_offer_no_listings")}</p>
          <p className="text-xs text-muted-foreground">{t("stay_offer_no_listings_hint")}</p>
          <Button asChild variant="outline" className="rounded-xl w-full sm:w-auto">
            <Link href="/opret">{t("stay_offer_cta_create")}</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <Link
        href="/dashboard?tab=open-requests"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        {t("stay_offer_back")}
      </Link>
      <div className="rounded-2xl border border-border bg-white p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#114788]">
              {t("stay_offer_guest_wish")}
            </p>
            <h1 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="capitalize">{stayLocation}</span>
            </h1>
            <span className="inline-flex rounded-md border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-foreground">
              {propertyBadge}
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <Calendar className="w-4 h-4 shrink-0" />
            {checkIn ? format(new Date(checkIn), "d. MMM yyyy", { locale: dateLocale }) : "—"}
            {" — "}
            {checkOut ? format(new Date(checkOut), "d. MMM yyyy", { locale: dateLocale }) : "—"}
            <span className="text-foreground/80">
              ({t("stay_offer_nights", { count: Math.max(1, nights) })})
            </span>
          </span>
          <span className="flex items-center gap-2">
            <Users className="w-4 h-4 shrink-0" />
            {t("stay_offer_guests", { count: numGuests })}
          </span>
        </div>

        {description?.trim() ? (
          <p className="text-sm text-foreground whitespace-pre-wrap border-t border-border/60 pt-3">
            {description.trim()}
          </p>
        ) : null}

        {maxPriceOre != null && maxPriceOre > 0 && (
          <p className="text-sm text-foreground flex items-center gap-2 pt-1 border-t border-border/60">
            <Banknote className="w-4 h-4 shrink-0 text-muted-foreground" aria-hidden />
            {t("stay_offer_budget_upto", { amount: formatKr(maxPriceOre) })}
          </p>
        )}

        {needsTransport ? (
          <p className="text-xs font-semibold inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-2.5 py-1 border border-primary/15">
            <Anchor className="w-3.5 h-3.5 shrink-0" aria-hidden />
            {t("stay_offer_needs_transport_badge")}
          </p>
        ) : null}
      </div>

      <div className="rounded-2xl border border-border bg-white p-5 sm:p-6 shadow-sm space-y-5">
        <div className="space-y-2">
          <Label htmlFor="stay-offer-cabin" className="text-sm font-medium">
            {t("stay_offer_select_listing")}
          </Label>
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger id="stay-offer-cabin" className="rounded-xl h-11 w-full">
              <SelectValue placeholder={t("stay_offer_listing_placeholder")} />
            </SelectTrigger>
            <SelectContent>
              {cabins.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.title} · {c.locationLabel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="stay-offer-price" className="text-sm font-medium">
            {t("stay_offer_price_label")}
          </Label>
          <div className="relative">
            <Input
              id="stay-offer-price"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              className="rounded-xl h-11 pr-14"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
              kr
            </span>
          </div>
          {selected && nights > 0 && (
            <p className="text-xs text-muted-foreground">
              {t("stay_offer_price_hint", {
                perNight: formatKr(selected.price_per_night_ore),
                nights: Math.max(1, nights),
              })}
            </p>
          )}
        </div>

        {needsTransport ? (
          <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={offerTransport}
                onCheckedChange={(c) => setOfferTransport(c === true)}
                className="mt-0.5"
              />
              <span className="text-sm font-medium text-foreground leading-snug">
                {t("stay_offer_transport_checkbox")}
              </span>
            </label>
            {offerTransport ? (
              <div className="space-y-2 pl-7">
                <Label htmlFor="stay-offer-transport" className="text-sm font-medium">
                  {t("stay_offer_transport_price_label")}
                </Label>
                <div className="relative">
                  <Input
                    id="stay-offer-transport"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    step={1}
                    value={transportPriceInput}
                    onChange={(e) => setTransportPriceInput(e.target.value)}
                    className="rounded-xl h-11 pr-14"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
                    kr
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{t("stay_offer_transport_help")}</p>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="stay-offer-message" className="text-sm font-medium">
            {t("stay_offer_message_label")}
          </Label>
          <Textarea
            id="stay-offer-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t("stay_offer_message_placeholder")}
            rows={4}
            className="rounded-xl resize-y min-h-[100px]"
          />
        </div>

        {fieldError && (
          <p className="text-sm text-destructive">{fieldError}</p>
        )}

        <div className="pt-2">
          <Button
            type="submit"
            disabled={pending}
            className="rounded-xl w-full bg-[#114788] hover:bg-[#0d3a6b] text-white h-11"
          >
            {pending ? t("stay_offer_submitting") : t("stay_offer_submit")}
          </Button>
        </div>
      </div>
    </form>
  )
}
