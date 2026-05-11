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

function unwrapNested<T>(x: T | T[] | null | undefined): T | null {
  if (x == null) return null
  return Array.isArray(x) ? (x[0] ?? null) : x
}

function formatStayRange(locale: string, isoFrom: string, isoTo: string): string {
  const loc   = locale === "en" ? "en-GB" : "da-DK"
  const short = new Intl.DateTimeFormat(loc, {
    day:      "numeric",
    month:    "short",
    year:     "numeric",
    timeZone: "UTC",
  })
  return `${short.format(new Date(isoFrom + "T12:00:00.000Z"))} – ${short.format(
    new Date(isoTo + "T12:00:00.000Z"),
  )}`
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "dashboard" })
  return buildMetadata({
    locale,
    title:       t("stay_offer_booking_success_meta"),
    description: t("stay_offer_booking_success_body"),
    path:        "/booking/stay-offer-success",
  })
}

export default async function StayOfferBookingSuccessPage({ params, searchParams }: PageProps) {
  const { locale }              = await params
  const { session_id: rawSid } = await searchParams
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: "dashboard" })

  const sessionId = rawSid?.trim() ?? ""
  let stayTitle: string | null  = null
  let dateRange: string | null  = null
  let cabinBookingId: string | null = null

  if (sessionId.length > 0) {
    const supabase = await createClient()
    const [{ data: row }, { data: cabinRow }] = await Promise.all([
      supabase
        .from("stay_offers")
        .select(`
          id,
          status,
          cabins ( title ),
          stay_requests ( desired_check_in, desired_check_out )
        `)
        .eq("stripe_session_id", sessionId)
        .maybeSingle(),
      supabase.from("cabin_bookings").select("id, status").eq("stripe_session_id", sessionId).maybeSingle(),
    ])

    if (cabinRow && cabinRow.status === "confirmed") {
      cabinBookingId = cabinRow.id
    }

    if (row && row.status === "accepted") {
      const cab = unwrapNested(row.cabins as { title: string | null } | { title: string | null }[] | null)
      const sr  = unwrapNested(
        row.stay_requests as
          | { desired_check_in: string; desired_check_out: string }
          | { desired_check_in: string; desired_check_out: string }[]
          | null,
      )
      if (cab?.title && sr) {
        stayTitle = cab.title.trim() || null
        dateRange = formatStayRange(locale, sr.desired_check_in, sr.desired_check_out)
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
        <h1 className="text-2xl font-bold text-foreground">{t("stay_offer_booking_success_title")}</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {t("stay_offer_booking_success_body")}
        </p>
        {stayTitle ? (
          <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-left text-sm space-y-2">
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
              {t("stay_offer_success_stay_label")}
            </p>
            <p className="font-semibold text-foreground">{stayTitle}</p>
            {dateRange ? (
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">{t("stay_offer_success_dates_label")}:</span>{" "}
                {dateRange}
              </p>
            ) : null}
          </div>
        ) : sessionId.length > 0 ? (
          <p className="text-muted-foreground text-xs">{t("stay_offer_success_fallback")}</p>
        ) : null}
        {cabinBookingId ? (
          <div className="text-left space-y-3">
            <ContactInfoCard booking_type="cabin_booking" booking_id={cabinBookingId} />
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
