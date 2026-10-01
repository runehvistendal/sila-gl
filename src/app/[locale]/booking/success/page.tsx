import { Suspense } from "react"
import { CheckCircle2, Clock, XCircle } from "lucide-react"
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { BookingSuccessTracker } from "@/components/analytics/BookingSuccessTracker"
import { createClient } from "@/lib/supabase-server"
import ContactInfoCard from "@/components/bookings/ContactInfoCard"
import AutoRefresh from "@/components/bookings/AutoRefresh"
import BookingTransportPrompt from "@/components/bookings/BookingTransportPrompt"
import { getLocationName } from "@/lib/greenlandLocations"

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "bookingSuccess" })
  return { title: `${t("meta_title")} — Sila.gl`, robots: { index: false } }
}

type PageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ session_id?: string }>
}

type BookingRow = {
  id: string
  status: string
  check_in: string
  check_out: string
  num_guests: number
  includes_transport: boolean | null
  transfer_route_id: string | null
  cabins: { title: string; location_hub: string; property_type: string | null } | null
}

export default async function BookingSuccessPage({ params, searchParams }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("bookingSuccess")
  const fmt = await getFormatter()

  const { session_id: rawSid } = await searchParams
  const sessionId = rawSid?.trim() ?? ""

  let booking: BookingRow | null = null
  if (sessionId.length > 0) {
    const supabase = await createClient()
    // RLS: kun gæstens egen booking kan læses
    const { data } = await supabase
      .from("cabin_bookings")
      .select(
        "id, status, check_in, check_out, num_guests, includes_transport, transfer_route_id, cabins ( title, location_hub, property_type )",
      )
      .eq("stripe_session_id", sessionId)
      .maybeSingle()
    booking = (data as unknown as BookingRow | null) ?? null
  }

  // pending = webhooken er ikke nået frem endnu · cancelled = datoerne blev taget, beløbet refunderes
  const state: "confirmed" | "pending" | "cancelled" | "unknown" =
    booking?.status === "confirmed" || booking?.status === "completed"
      ? "confirmed"
      : booking?.status === "pending"
        ? "pending"
        : booking?.status === "cancelled"
          ? "cancelled"
          : "unknown"

  const day = (ymd: string) =>
    fmt.dateTime(new Date(`${ymd}T12:00:00Z`), { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" })

  const needsTransport =
    state === "confirmed" &&
    booking?.cabins?.property_type !== "residence" &&
    !booking?.includes_transport &&
    !booking?.transfer_route_id

  return (
    <main
      className="min-h-screen flex flex-col items-center px-4 py-16 sm:py-24 bg-background"
      style={{ fontFamily: "var(--font-jakarta, system-ui)" }}
    >
      <Suspense fallback={null}>
        <BookingSuccessTracker />
      </Suspense>
      {state === "pending" && <AutoRefresh />}

      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            {state === "cancelled" ? (
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
                <XCircle className="w-9 h-9 text-amber-600" aria-hidden />
              </div>
            ) : state === "pending" ? (
              <div className="w-16 h-16 rounded-full bg-[#114788]/10 flex items-center justify-center">
                <Clock className="w-9 h-9 text-[#114788] animate-pulse" aria-hidden />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-9 h-9 text-emerald-600" aria-hidden />
              </div>
            )}
          </div>
          <h1 className="text-2xl font-bold text-foreground" role="status">
            {t(`title_${state}`)}
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">{t(`body_${state}`)}</p>
        </div>

        {booking?.cabins && state !== "unknown" && (
          <dl className="rounded-2xl border border-border bg-white p-4 text-sm grid grid-cols-2 gap-y-3">
            <dt className="col-span-2 text-base font-bold text-foreground">{booking.cabins.title}</dt>
            <div>
              <dt className="text-xs text-muted-foreground">{t("where")}</dt>
              <dd className="font-medium text-foreground">{getLocationName(booking.cabins.location_hub)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("guests")}</dt>
              <dd className="font-medium text-foreground">{booking.num_guests}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("check_in")}</dt>
              <dd className="font-medium text-foreground first-letter:uppercase">{day(booking.check_in)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("check_out")}</dt>
              <dd className="font-medium text-foreground first-letter:uppercase">{day(booking.check_out)}</dd>
            </div>
          </dl>
        )}

        {needsTransport && booking?.cabins && (
          <BookingTransportPrompt
            bookingId={booking.id}
            locationHub={booking.cabins.location_hub}
            checkIn={booking.check_in}
            checkOut={booking.check_out}
            guests={booking.num_guests}
          />
        )}

        {state === "confirmed" && booking ? (
          <ContactInfoCard booking_type="cabin_booking" booking_id={booking.id} />
        ) : null}

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/dashboard"
            className="inline-flex sm:flex-1 shrink-0 justify-center h-12 items-center rounded-xl px-6 font-semibold text-white bg-[#114788] hover:bg-[#114788]/90 transition-colors"
          >
            {t("cta_dashboard")}
          </Link>
          <Link
            href="/ophold/i-naturen"
            className="inline-flex sm:flex-1 shrink-0 justify-center h-12 items-center rounded-xl px-6 font-semibold border border-border text-foreground hover:bg-muted transition-colors"
          >
            {t("cta_browse")}
          </Link>
        </div>
      </div>
    </main>
  )
}
