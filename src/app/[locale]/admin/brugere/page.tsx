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
import AdminToggleAdmin from "./AdminToggleAdmin"

export const metadata = { title: "Brugere — Admin" }
export const dynamic = "force-dynamic"

export default async function AdminBrugerePage() {
  const t = await getTranslations("admin")
  const svc = createServiceClient()

  const [{ data: profiles }, { data: authData }] = await Promise.all([
    svc
      .from("profiles")
      .select("id, full_name, role_type, is_admin, created_at")
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    svc.auth.admin.listUsers({ perPage: 1000 }),
  ])

  const emailMap = new Map(
    (authData?.users ?? []).map((u) => [u.id, u.email ?? null])
  )

  const users = (profiles ?? []).map((p) => ({
    id: p.id,
    full_name: p.full_name as string | null,
    email: emailMap.get(p.id) ?? null,
    role_type: p.role_type as string | null,
    is_admin: p.is_admin as boolean,
    created_at: p.created_at as string,
  }))

  const rolleLabel: Record<string, string> = {
    traveler: t("role_traveler"),
    provider: t("role_provider"),
    both: t("role_both"),
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t("users")}</h1>
        <p className="text-gray-500 mt-1">{t("registered_users", { count: users.length })}</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-semibold">{t("col_name")}</TableHead>
              <TableHead className="font-semibold">{t("col_email")}</TableHead>
              <TableHead className="font-semibold">{t("col_role")}</TableHead>
              <TableHead className="font-semibold">{t("col_admin")}</TableHead>
              <TableHead className="font-semibold">{t("col_created")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id} className="hover:bg-gray-50">
                <TableCell className="font-medium">
                  {u.full_name ?? (
                    <span className="text-gray-400 italic">{t("unknown_user")}</span>
                  )}
                </TableCell>
                <TableCell className="text-gray-600 text-sm">
                  {u.email ?? "—"}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {rolleLabel[u.role_type ?? ""] ?? u.role_type ?? "—"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {u.is_admin ? (
                    <Badge className="bg-violet-100 text-violet-800 border-violet-200 text-xs">
                      {t("col_admin")}
                    </Badge>
                  ) : (
                    <span className="text-gray-400 text-sm">—</span>
                  )}
                </TableCell>
                <TableCell className="text-gray-500 text-sm">
                  {new Date(u.created_at).toLocaleDateString("da-DK")}
                </TableCell>
                <TableCell className="text-right">
                  <AdminToggleAdmin userId={u.id} isAdmin={u.is_admin} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
