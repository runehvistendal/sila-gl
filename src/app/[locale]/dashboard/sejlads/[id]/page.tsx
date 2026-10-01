import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { ArrowLeft, Anchor, Users, Clock, MapPin } from "lucide-react"
import { createClient } from "@/lib/supabase-server"
import { getNavUserForPage } from "@/lib/getNavUser"
import Navbar from "@/components/layout/Navbar"
import { Link } from "@/i18n/navigation"
import { getLocationName } from "@/lib/greenlandLocations"
import { formatNuukFull } from "@/lib/nuukTime"
import { getContactInfo } from "@/app/actions/contactInfo"
import ManifestActions from "./ManifestActions"

type PageProps = { params: Promise<{ locale: string; id: string }> }

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "dashboard" })
  // Passagerlister indekseres aldrig
  return { title: `${t("manifest_title")} — Sila.gl`, robots: { index: false, follow: false } }
}

type Passenger = {
  id: string
  status: string
  num_seats: number
  name: string
  phone: string | null
}

/**
 * Sejlerens passagerliste for én samsejlads.
 * BEK nr. 956/2012 § 4, stk. 10: antallet af personer om bord skal være kendt
 * og opbevares i land. Siden er print-venlig, så den kan efterlades i land.
 */
export default async function RideShareManifestPage({ params }: PageProps) {
  const { locale, id } = await params
  setRequestLocale(locale)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/dashboard/sejlads/${id}`)}`)
  }

  const t = await getTranslations({ locale, namespace: "dashboard" })
  const navUser = await getNavUserForPage(supabase, user)

  const { data: rsRaw } = await supabase
    .from("ride_shares")
    .select(
      "id, skipper_id, from_location, to_location, departure_at, total_seats, seats_available, status, meeting_point, estimated_duration_minutes, boats ( name )",
    )
    .eq("id", id)
    .eq("skipper_id", user.id)
    .maybeSingle()

  if (!rsRaw) notFound()

  const rs = rsRaw as {
    id: string
    from_location: string
    to_location: string
    departure_at: string
    total_seats: number
    seats_available: number
    status: string
    meeting_point: string | null
    estimated_duration_minutes: number | null
    boats: { name: string } | { name: string }[] | null
  }
  const boatName = Array.isArray(rs.boats) ? rs.boats[0]?.name : rs.boats?.name

  const { data: bookingRows } = await supabase
    .from("ride_share_bookings")
    .select("id, status, num_seats, passenger_id, profiles!passenger_id ( full_name )")
    .eq("ride_share_id", id)
    .in("status", ["pending", "confirmed"])
    .order("created_at", { ascending: true })

  const passengers: Passenger[] = await Promise.all(
    ((bookingRows ?? []) as Array<{
      id: string
      status: string
      num_seats: number
      profiles: { full_name: string | null } | { full_name: string | null }[] | null
    }>).map(async (b) => {
      const prof = Array.isArray(b.profiles) ? b.profiles[0] : b.profiles
      const contact = b.status === "confirmed" ? await getContactInfo("ride_share", b.id) : null
      return {
        id: b.id,
        status: b.status,
        num_seats: b.num_seats,
        name: prof?.full_name?.trim() || "Sila-gæst",
        phone: contact?.phone || null,
      }
    }),
  )

  const confirmed = passengers.filter((p) => p.status === "confirmed")
  const confirmedSeats = confirmed.reduce((sum, p) => sum + p.num_seats, 0)
  const isCancelled = rs.status === "cancelled"
  const isUpcoming = new Date(rs.departure_at).getTime() > Date.now()

  return (
    <main className="min-h-screen bg-background">
      <div className="print:hidden">
        <Navbar user={navUser} />
      </div>

      <div className="mx-auto max-w-2xl px-4 pt-20 pb-24 print:pt-4">
        <Link
          href="/dashboard?tab=bookings"
          className="print:hidden inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("manifest_back")}
        </Link>

        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("manifest_title")}
        </p>
        <h1 className="text-2xl font-bold text-foreground mt-1">
          {getLocationName(rs.from_location)} → {getLocationName(rs.to_location)}
        </h1>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="w-4 h-4" /> {formatNuukFull(rs.departure_at)}
          </span>
          {boatName && (
            <span className="inline-flex items-center gap-1.5">
              <Anchor className="w-4 h-4" /> {boatName}
            </span>
          )}
          {rs.meeting_point && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="w-4 h-4" /> {rs.meeting_point}
            </span>
          )}
        </div>

        {isCancelled && (
          <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive">
            {t("manifest_status_cancelled")}
          </div>
        )}

        {/* Antal om bord */}
        <section className="mt-6 rounded-2xl border border-border bg-white p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#114788]/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-[#114788]" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">
                  {t("manifest_onboard", { count: confirmedSeats + 1 })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("manifest_booked", {
                    booked: rs.total_seats - rs.seats_available,
                    total: rs.total_seats,
                  })}
                </p>
              </div>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{t("manifest_onboard_hint")}</p>
        </section>

        {/* Passagerer */}
        <section className="mt-4 rounded-2xl border border-border bg-white overflow-hidden">
          {passengers.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">{t("manifest_empty")}</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-semibold">{t("manifest_col_name")}</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold text-center">{t("manifest_col_seats")}</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">{t("manifest_col_phone")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {passengers.map((p) => (
                  <tr key={p.id} className={p.status === "pending" ? "text-muted-foreground" : ""}>
                    <td className="px-4 py-3">
                      <span className="font-medium text-foreground">{p.name}</span>
                      {p.status === "pending" && (
                        <span className="block text-xs">{t("manifest_awaiting_payment")}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums">{p.num_seats}</td>
                    <td className="px-4 py-3">
                      {p.phone ? (
                        <a href={`tel:${p.phone}`} className="text-[#114788] underline-offset-2 hover:underline">
                          {p.phone}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Tjekliste */}
        <section className="mt-4 rounded-2xl border border-border bg-white p-5">
          <h2 className="text-sm font-semibold text-foreground">{t("manifest_checklist_title")}</h2>
          <ul className="mt-3 space-y-2.5 text-sm text-muted-foreground">
            {(["manifest_check_1", "manifest_check_2", "manifest_check_3", "manifest_check_4"] as const).map((k) => (
              <li key={k} className="flex items-start gap-2.5">
                <span aria-hidden className="mt-0.5 h-4 w-4 shrink-0 rounded border border-border" />
                {t(k)}
              </li>
            ))}
          </ul>
        </section>

        <ManifestActions
          rideShareId={rs.id}
          confirmedCount={confirmed.length}
          canCancel={!isCancelled && isUpcoming && ["active", "full"].includes(rs.status)}
        />
      </div>
    </main>
  )
}
