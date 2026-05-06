import { getLocale, getTranslations } from "next-intl/server"
import { TrendingUp } from "lucide-react"
import { formatKr } from "@/lib/money"
import {
  fetchAdminKeyMetrics,
  padMonthlyRevenue,
  toNumberMetrics,
} from "@/lib/admin-key-metrics"

export const metadata = { title: "Admin — Sila.gl" }
export const dynamic = "force-dynamic"

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
      <p className="text-xs sm:text-sm text-gray-500 font-medium leading-snug">{label}</p>
      <p className="mt-1.5 text-xl sm:text-2xl font-bold text-gray-900 tabular-nums break-words">
        {value}
      </p>
      {hint ? <p className="mt-1.5 text-xs text-gray-400 leading-relaxed">{hint}</p> : null}
    </div>
  )
}

function SectionTitle({
  title,
  className = "",
}: {
  title: string
  className?: string
}) {
  return (
    <h2
      className={`text-base sm:text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4 ${className}`}
    >
      {title}
    </h2>
  )
}

export default async function AdminPage() {
  const t = await getTranslations("admin")
  const locale = await getLocale()

  const raw = await fetchAdminKeyMetrics()
  const m = raw ? toNumberMetrics(raw) : null
  const monthly = raw ? padMonthlyRevenue(raw.monthly_revenue, locale) : []

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{t("dashboard")}</h1>
        <p className="text-gray-500 mt-1">{t("overview")}</p>
      </div>

      {!raw || !m ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 text-amber-900 px-4 py-3 text-sm mb-8">
          {t("metrics_unavailable")}
        </p>
      ) : (
        <section className="mb-10 space-y-10">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-[#124788]" aria-hidden />
              <h2 className="text-xl font-bold text-gray-900">{t("metrics_heading")}</h2>
            </div>

            {/* Omsætning */}
            <div className="mb-8">
              <SectionTitle title={t("metrics_revenue_section")} />
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                <MetricCard
                  label={t("metrics_revenue_total")}
                  value={formatKr(m.revenueTotal)}
                  hint={t("metrics_revenue_breakdown", {
                    cabin: formatKr(m.cabinRevenue),
                    rides: formatKr(m.rideShareRevenue),
                    transport: formatKr(m.transportRevenue),
                  })}
                />
                <MetricCard
                  label={t("metrics_platform_fee")}
                  value={formatKr(m.platformFee)}
                  hint={t("metrics_platform_fee_hint")}
                />
                <MetricCard label={t("metrics_revenue_30d")} value={formatKr(m.revenueLast30d)} />
              </div>
              <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
                <p className="text-xs sm:text-sm text-gray-500 font-medium mb-3">
                  {t("metrics_revenue_by_month")}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {monthly.map((row) => (
                    <div key={row.monthLabel} className="text-center sm:text-left">
                      <p className="text-xs text-gray-500 capitalize">{row.monthLabel}</p>
                      <p className="text-base sm:text-lg font-semibold text-gray-900 tabular-nums">
                        {formatKr(row.totalOre)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bookinger */}
            <div className="mb-8">
              <SectionTitle title={t("metrics_bookings_section")} />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <MetricCard
                  label={t("metrics_bookings_total")}
                  value={String(m.bookingsTotal)}
                  hint={t("metrics_bookings_split_value", {
                    cabin: m.bookingsCabin,
                    rides: m.bookingsRide,
                    transport: m.bookingsTransport,
                  })}
                />
                <MetricCard
                  label={t("metrics_bookings_30d")}
                  value={String(m.bookingsTotal30d)}
                />
                <MetricCard label={t("metrics_avg_booking")} value={formatKr(m.avgBooking)} />
                <MetricCard
                  label={t("metrics_cancelled")}
                  value={String(m.cancelledTotal)}
                  hint={t("metrics_cancelled_split", {
                    cabin: m.cancelledCabin,
                    rides: m.cancelledRide,
                  })}
                />
              </div>
            </div>

            {/* Brugere */}
            <div className="mb-8">
              <SectionTitle title={t("metrics_users_section")} />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <MetricCard label={t("metrics_users_total")} value={String(m.usersTotal)} />
                <MetricCard label={t("metrics_users_new_30d")} value={String(m.usersNew30d)} />
                <MetricCard
                  label={t("metrics_users_roles")}
                  value={t("metrics_users_roles_value", {
                    t: m.roleTraveler,
                    p: m.roleProvider,
                    b: m.roleBoth,
                  })}
                />
              </div>
            </div>

            {/* Udbydere */}
            <div className="mb-8">
              <SectionTitle title={t("metrics_providers_section")} />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <MetricCard label={t("metrics_active_cabins")} value={String(m.cabinsPublished)} />
                <MetricCard label={t("metrics_draft_cabins")} value={String(m.cabinsDraft)} />
                <MetricCard label={t("metrics_active_skippers")} value={String(m.skippers)} />
                <MetricCard label={t("metrics_stripe_ready")} value={String(m.stripeOnboarding)} />
              </div>
            </div>

            {/* Anmodninger */}
            <div>
              <SectionTitle title={t("metrics_requests_section")} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <MetricCard
                  label={t("metrics_cabin_requests_open")}
                  value={String(m.cabinRequestsOpen)}
                />
                <MetricCard
                  label={t("metrics_transport_requests_open")}
                  value={String(m.transportRequestsOpen)}
                />
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-gray-400" />
          <h2 className="font-semibold text-gray-900">{t("quick_links")}</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { href: "/admin/brugere", label: t("manage_users") },
            { href: "/admin/hytter", label: t("manage_cabins") },
            { href: "/admin/bookinger", label: t("see_bookings") },
            { href: "/admin/anmodninger", label: t("see_requests") },
          ].map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className="block p-3 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
            >
              {label} →
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
