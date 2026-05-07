import { getTranslations } from "next-intl/server"
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
import { publishedCabinDetailPath } from "@/lib/cabinPublicPaths"
import AdminTogglePublished from "./AdminTogglePublished"
import { getLocationName } from "@/lib/greenlandLocations"

export const metadata = { title: "Hytter — Admin" }
export const dynamic = "force-dynamic"

export default async function AdminHytterPage() {
  const t = await getTranslations("admin")
  const svc = createServiceClient()

  const { data: cabins } = await svc
    .from("cabins")
    .select("id, title, owner_id, location_hub, price_per_night_ore, published, created_at, property_type, profiles!owner_id(full_name)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })

  type CabinRow = {
    id: string
    title: string
    owner_id: string
    location_hub: string | null
    price_per_night_ore: number
    published: boolean
    created_at: string
    property_type: string | null
    profiles: { full_name: string | null } | null
  }

  const rows = (cabins ?? []) as unknown as CabinRow[]

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t("cabins")}</h1>
        <p className="text-gray-500 mt-1">{t("cabins_total", { count: rows.length })}</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-semibold">{t("col_title")}</TableHead>
              <TableHead className="font-semibold">{t("col_owner")}</TableHead>
              <TableHead className="font-semibold">{t("col_location")}</TableHead>
              <TableHead className="font-semibold">{t("col_price_per_night")}</TableHead>
              <TableHead className="font-semibold">{t("col_status")}</TableHead>
              <TableHead className="font-semibold">{t("col_created")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((cabin) => (
              <TableRow key={cabin.id} className="hover:bg-gray-50">
                <TableCell className="font-medium">
                  <a
                    href={publishedCabinDetailPath(cabin.property_type, cabin.id)}
                    className="hover:underline text-blue-600"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {cabin.title}
                  </a>
                </TableCell>
                <TableCell className="text-gray-600 text-sm">
                  {cabin.profiles?.full_name ?? <span className="text-gray-400 italic">{t("unknown")}</span>}
                </TableCell>
                <TableCell className="text-gray-600 text-sm">
                  {cabin.location_hub ? getLocationName(cabin.location_hub) : "—"}
                </TableCell>
                <TableCell className="text-gray-700 text-sm">
                  {formatKr(cabin.price_per_night_ore)}
                </TableCell>
                <TableCell>
                  {cabin.published ? (
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs">{t("status_published")}</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs text-gray-500">{t("status_draft")}</Badge>
                  )}
                </TableCell>
                <TableCell className="text-gray-500 text-sm">
                  {new Date(cabin.created_at).toLocaleDateString("da-DK")}
                </TableCell>
                <TableCell className="text-right">
                  <AdminTogglePublished cabinId={cabin.id} published={cabin.published} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
