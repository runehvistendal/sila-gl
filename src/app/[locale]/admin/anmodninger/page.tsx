import { getLocale, getTranslations } from "next-intl/server"
import { createServiceClient } from "@/lib/supabase-service"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { formatKr } from "@/lib/money"

export const metadata = { title: "Anmodninger — Admin" }
export const dynamic = "force-dynamic"

const STATUS_CLASSES: Record<string, string> = {
  open:      "bg-emerald-100 text-emerald-800 border-emerald-200",
  matched:   "bg-blue-100 text-blue-800 border-blue-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
  expired:   "bg-gray-100 text-gray-600 border-gray-200",
}

export default async function AdminAnmodningerPage() {
  const locale = await getLocale()
  const t = await getTranslations("admin")
  const tReq = await getTranslations({ locale, namespace: "request" })
  const svc = createServiceClient()

  const statusLabel: Record<string, string> = {
    open:      t("status_open"),
    matched:   t("status_matched"),
    cancelled: t("status_cancelled"),
    expired:   t("status_expired"),
  }

  const { data: requests } = await svc
    .from("stay_requests")
    .select(`
      id, location, desired_check_in, desired_check_out, num_guests,
      max_price_ore, status, created_at, property_type,
      profiles!guest_id(full_name)
    `)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(200)

  type RequestRow = {
    id: string
    location: string
    desired_check_in: string
    desired_check_out: string
    num_guests: number
    max_price_ore: number | null
    status: string
    created_at: string
    property_type?: string | null
    profiles: { full_name: string | null } | null
  }

  const rows = (requests ?? []) as unknown as RequestRow[]

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t("requests")}</h1>
        <p className="text-gray-500 mt-1">{t("requests_count", { count: rows.length })}</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-semibold">{t("col_guest")}</TableHead>
              <TableHead className="font-semibold">{t("col_destination")}</TableHead>
              <TableHead className="font-semibold">{t("col_stay_type")}</TableHead>
              <TableHead className="font-semibold">{t("col_check_in")}</TableHead>
              <TableHead className="font-semibold">{t("col_check_out")}</TableHead>
              <TableHead className="font-semibold">{t("col_count")}</TableHead>
              <TableHead className="font-semibold">{t("col_max_budget")}</TableHead>
              <TableHead className="font-semibold">{t("col_status")}</TableHead>
              <TableHead className="font-semibold">{t("col_created")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const label = statusLabel[r.status] ?? r.status
              const className = STATUS_CLASSES[r.status] ?? "bg-gray-100 text-gray-600 border-gray-200"
              return (
                <TableRow key={r.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium text-sm">
                    {r.profiles?.full_name ?? <span className="text-gray-400 italic">{t("unknown")}</span>}
                  </TableCell>
                  <TableCell className="text-gray-700 text-sm capitalize">
                    {r.location || "—"}
                  </TableCell>
                  <TableCell className="text-gray-700 text-sm">
                    {r.property_type === "residence"
                      ? tReq("badge_residence")
                      : r.property_type === "any"
                        ? tReq("badge_any")
                        : tReq("badge_cabin")}
                  </TableCell>
                  <TableCell className="text-gray-700 text-sm">
                    {new Date(r.desired_check_in).toLocaleDateString("da-DK")}
                  </TableCell>
                  <TableCell className="text-gray-700 text-sm">
                    {new Date(r.desired_check_out).toLocaleDateString("da-DK")}
                  </TableCell>
                  <TableCell className="text-gray-600 text-sm text-center">
                    {r.num_guests}
                  </TableCell>
                  <TableCell className="text-gray-600 text-sm">
                    {r.max_price_ore ? formatKr(r.max_price_ore) : <span className="text-gray-400">—</span>}
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-xs ${className}`}>
                      {label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-500 text-sm">
                    {new Date(r.created_at).toLocaleDateString("da-DK")}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
