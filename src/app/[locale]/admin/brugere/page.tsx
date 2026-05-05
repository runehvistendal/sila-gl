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

const rolleLabel: Record<string, string> = {
  traveler: "Gæst",
  provider: "Udbyder",
  both: "Begge",
}

export default async function AdminBrugerePage() {
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

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Brugere</h1>
        <p className="text-gray-500 mt-1">{users.length} registrerede brugere</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-semibold">Navn</TableHead>
              <TableHead className="font-semibold">E-mail</TableHead>
              <TableHead className="font-semibold">Rolle</TableHead>
              <TableHead className="font-semibold">Admin</TableHead>
              <TableHead className="font-semibold">Oprettet</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id} className="hover:bg-gray-50">
                <TableCell className="font-medium">
                  {u.full_name ?? (
                    <span className="text-gray-400 italic">Sila-bruger</span>
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
                      Admin
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
