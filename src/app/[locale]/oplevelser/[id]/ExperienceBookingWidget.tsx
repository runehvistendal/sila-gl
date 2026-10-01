"use client"

import { useCallback, useMemo, useState, useTransition } from "react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CalendarDropdown } from "@/components/shared/CalendarDropdown"
import { localTodayYmd } from "@/lib/calendarYmd"
import { calcDisplayPrice, calcServiceFee } from "@/lib/money"
import { useFormatPrice } from "@/hooks/useFormatPrice"
import { createExperienceBooking } from "./actions"
import { toast } from "sonner"

type Props = {
  experienceId: string
  pricePerPersonOre: number
  maxParticipants: number
  durationMinutes: number | null
  isLoggedIn: boolean
  loginNextPath: string
  disabledYmd: string[]
  capacityByDate: Record<string, number>
}

export default function ExperienceBookingWidget({
  experienceId,
  pricePerPersonOre,
  maxParticipants,
  durationMinutes,
  isLoggedIn,
  loginNextPath,
  disabledYmd,
  capacityByDate,
}: Props) {
  const t = useTranslations("experienceDetail")
  const formatPrice = useFormatPrice()
  const [pending, startTransition] = useTransition()
  const todayYmd = localTodayYmd()

  const disabledSet = useMemo(() => new Set(disabledYmd), [disabledYmd])

  const [singleDate, setSingleDate] = useState("")
  const [participantsStr, setParticipantsStr] = useState("1")

  const participants = Math.floor(Number(participantsStr))
  const participantsValid = Number.isFinite(participants) && participants >= 1

  const isUnavailable = useCallback(
    (ymd: string) => {
      if (disabledSet.has(ymd)) return true
      const used = capacityByDate[ymd] ?? 0
      const p = participantsValid ? participants : 1
      if (used >= maxParticipants) return true
      return used + p > maxParticipants
    },
    [disabledSet, capacityByDate, participants, participantsValid, maxParticipants],
  )

  const pricePerPersonGuestOre = calcDisplayPrice(pricePerPersonOre)

  const totalDisplayOre = useMemo(() => {
    if (!participantsValid || participants > maxParticipants) return null
    const sub = pricePerPersonOre * participants
    return sub + calcServiceFee(sub)
  }, [participantsValid, participants, maxParticipants, pricePerPersonOre])

  const durationLabel =
    durationMinutes != null && durationMinutes > 0
      ? durationMinutes >= 120 && durationMinutes % 60 === 0
        ? durationMinutes === 120
          ? t("duration_hours_one", { count: durationMinutes / 60 })
          : t("duration_hours_other", { count: durationMinutes / 60 })
        : t("duration_minutes", { count: durationMinutes })
      : null

  function handleBook() {
    if (!isLoggedIn) return
    if (!singleDate) {
      toast.error(t("booking_pick_date"))
      return
    }
    if (!participantsValid || participants < 1 || participants > maxParticipants) {
      toast.error(t("booking_invalid_participants"))
      return
    }
    if (isUnavailable(singleDate)) {
      toast.error(t("booking_full"))
      return
    }

    startTransition(async () => {
      const res = await createExperienceBooking({
        experience_id: experienceId,
        date: singleDate,
        num_participants: participants,
      })
      if ("error" in res && res.error) {
        toast.error(res.error)
        return
      }
      if ("url" in res && res.url) {
        window.location.href = res.url
      }
    })
  }

  const loginHref = `/login?next=${encodeURIComponent(loginNextPath)}`

  return (
    <div
      id="experience-booking"
      className="w-full"
      style={{ fontFamily: "var(--font-jakarta, system-ui)" }}
    >
      <h2 className="text-lg sm:text-xl font-bold text-foreground mb-1">{t("booking_heading")}</h2>
      <p className="text-sm text-muted-foreground mb-4">{t("booking_subtitle")}</p>

      <div className="bg-white dark:bg-card rounded-2xl border border-border shadow-card p-4 sm:p-5 space-y-4">
        <div>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
            {t("select_date")}
          </span>
          <div className="flex justify-center py-1 rounded-xl border border-border/80 bg-muted/20">
            <CalendarDropdown
              mode="single"
              today={todayYmd}
              checkIn=""
              checkOut=""
              singleDate={singleDate}
              onRangeChange={() => {}}
              onSingleChange={(d) => setSingleDate(d)}
              isUnavailable={isUnavailable}
              showSingleMonth
              className="w-full max-w-md border-0 bg-transparent p-1 shadow-none md:p-2"
            />
          </div>
        </div>

        <div>
          <Label
            htmlFor="exp-book-participants"
            className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block"
          >
            {t("participants_label")}
          </Label>
          <Input
            id="exp-book-participants"
            type="number"
            min={1}
            max={maxParticipants}
            value={participantsStr}
            onChange={(e) => setParticipantsStr(e.target.value)}
            className="rounded-xl h-11 w-full sm:max-w-[12rem]"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {t("max_participants_hint", { count: maxParticipants })}
          </p>
        </div>

        {durationLabel ? (
          <p className="text-sm text-muted-foreground">{durationLabel}</p>
        ) : null}

        <div className="space-y-1 text-sm border-t border-border/70 pt-4">
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">{t("price_per_person")}</span>
            <span className="font-semibold tabular-nums">{formatPrice(pricePerPersonGuestOre)}</span>
          </div>
          <p className="text-xs text-muted-foreground">{t("price_includes_service_fee_short")}</p>
          <div className="flex justify-between gap-3 pt-2 font-semibold">
            <span>{t("total")}</span>
            <span className="tabular-nums text-[#114788]">
              {totalDisplayOre != null ? formatPrice(totalDisplayOre) : "—"}
            </span>
          </div>
        </div>

        {isLoggedIn ? (
          <Button
            type="button"
            disabled={pending}
            className="w-full rounded-xl h-12 font-semibold text-white hover:opacity-95"
            style={{ backgroundColor: "#114788" }}
            onClick={handleBook}
          >
            {pending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2 inline" aria-hidden />
                …
              </>
            ) : (
              t("book")
            )}
          </Button>
        ) : (
          <Button
            type="button"
            asChild
            className="w-full rounded-xl h-12 font-semibold text-white hover:opacity-95"
            style={{ backgroundColor: "#114788" }}
          >
            <Link href={loginHref}>{t("login_to_book")}</Link>
          </Button>
        )}
      </div>
    </div>
  )
}
