import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { CheckCircle2 } from "lucide-react"
import { buildMetadata } from "@/lib/metadata"
import { createClient } from "@/lib/supabase-server"
import ContactInfoCard from "@/components/bookings/ContactInfoCard"

type PageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ session_id?: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "dashboard" })
  return buildMetadata({
    locale,
    title: t("experience_booking_success_meta"),
    description: t("experience_booking_success_body"),
    path: "/booking/oplevelse-success",
  })
}

export default async function ExperienceBookingSuccessPage({ params, searchParams }: PageProps) {
  const { locale } = await params
  const { session_id: rawSid } = await searchParams
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: "dashboard" })

  const sessionId = rawSid?.trim() ?? ""
  let experienceTitle: string | null = null
  let dateLabel: string | null = null
  let participantsLabel: string | null = null
  let bookingId: string | null = null

  if (sessionId.length > 0) {
    const supabase = await createClient()
    const { data: bookRow } = await supabase
      .from("experience_bookings")
      .select("id, status, date, num_participants, experience_id")
      .eq("stripe_session_id", sessionId)
      .maybeSingle()

    if (bookRow && bookRow.status === "confirmed") {
      bookingId = bookRow.id as string

      const { data: expTitleRow } = await supabase
        .from("experiences")
        .select("title")
        .eq("id", (bookRow as { experience_id: string }).experience_id)
        .maybeSingle()

      experienceTitle =
        typeof expTitleRow?.title === "string" && expTitleRow.title.trim() !== ""
          ? expTitleRow.title.trim()
          : null

      const dateRaw = String((bookRow as { date: string }).date).slice(0, 10)
      const loc = locale === "en" ? "en-GB" : "da-DK"
      dateLabel = new Intl.DateTimeFormat(loc, {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(dateRaw + "T12:00:00.000Z"))

      const np = Math.floor(Number((bookRow as { num_participants: number }).num_participants))
      if (Number.isFinite(np) && np >= 1) {
        participantsLabel = String(np)
      }
    }
  }

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-4 bg-background"
      style={{ fontFamily: "var(--font-jakarta, system-ui)" }}
    >
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="w-9 h-9 text-emerald-600" aria-hidden />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-foreground">{t("experience_booking_success_title")}</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">{t("experience_booking_success_body")}</p>

        {experienceTitle ? (
          <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-left text-sm space-y-2">
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
              {t("experience_success_summary_title")}
            </p>
            <p className="font-semibold text-foreground">{experienceTitle}</p>
            {dateLabel ? (
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">{t("experience_success_date_label")}:</span>{" "}
                {dateLabel}
              </p>
            ) : null}
            {participantsLabel ? (
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">
                  {t("experience_success_participants_label")}:
                </span>{" "}
                {participantsLabel}
              </p>
            ) : null}
          </div>
        ) : sessionId.length > 0 ? (
          <p className="text-muted-foreground text-xs">{t("experience_success_fallback")}</p>
        ) : null}

        {bookingId ? (
          <div className="text-left space-y-3">
            <ContactInfoCard booking_type="experience_booking" booking_id={bookingId} />
          </div>
        ) : null}

        <Link
          href="/dashboard?tab=bookings"
          className="inline-flex w-full sm:w-auto justify-center h-12 items-center rounded-xl px-6 font-semibold text-primary-foreground bg-primary hover:bg-primary/90 transition-colors"
        >
          {t("stay_offer_booking_success_cta")}
        </Link>
      </div>
    </main>
  )
}
