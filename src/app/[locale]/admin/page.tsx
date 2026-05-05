import { createServiceClient } from "@/lib/supabase-service"
import { Users, Home, CalendarCheck, MessageSquare, TrendingUp } from "lucide-react"

export const metadata = { title: "Admin — Sila.gl" }
export const dynamic = "force-dynamic"

interface StatCardProps {
  label: string
  value: number | string
  icon: React.ElementType
  color: string
}

function StatCard({ label, value, icon: Icon, color }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div>
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  )
}

export default async function AdminPage() {
  const svc = createServiceClient()

  const [
    { count: totalUsers },
    { count: publishedCabins },
    { count: totalCabins },
    { count: confirmedBookings },
    { count: totalBookings },
    { count: openRequests },
    { count: totalRequests },
  ] = await Promise.all([
    svc.from("profiles").select("id", { count: "exact", head: true }),
    svc.from("cabins").select("id", { count: "exact", head: true }).eq("published", true).is("deleted_at", null),
    svc.from("cabins").select("id", { count: "exact", head: true }).is("deleted_at", null),
    svc.from("cabin_bookings").select("id", { count: "exact", head: true }).eq("status", "confirmed").is("deleted_at", null),
    svc.from("cabin_bookings").select("id", { count: "exact", head: true }).is("deleted_at", null),
    svc.from("cabin_requests").select("id", { count: "exact", head: true }).eq("status", "open").is("deleted_at", null),
    svc.from("cabin_requests").select("id", { count: "exact", head: true }).is("deleted_at", null),
  ])

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overblik over Sila.gl platformen</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-10">
        <StatCard
          label="Brugere i alt"
          value={totalUsers ?? 0}
          icon={Users}
          color="bg-blue-500"
        />
        <StatCard
          label="Aktive hytter"
          value={`${publishedCabins ?? 0} / ${totalCabins ?? 0}`}
          icon={Home}
          color="bg-emerald-500"
        />
        <StatCard
          label="Bookinger bekræftet"
          value={`${confirmedBookings ?? 0} / ${totalBookings ?? 0}`}
          icon={CalendarCheck}
          color="bg-violet-500"
        />
        <StatCard
          label="Åbne anmodninger"
          value={`${openRequests ?? 0} / ${totalRequests ?? 0}`}
          icon={MessageSquare}
          color="bg-amber-500"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-gray-400" />
          <h2 className="font-semibold text-gray-900">Hurtige links</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { href: "/admin/brugere", label: "Administrer brugere" },
            { href: "/admin/hytter", label: "Administrer hytter" },
            { href: "/admin/bookinger", label: "Se bookinger" },
            { href: "/admin/anmodninger", label: "Se anmodninger" },
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
