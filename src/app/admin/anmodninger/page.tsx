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

const statusLabel: Record<string, { label: string; className: string }> = {
  open:      { label: "Åben",       className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  matched:   { label: "Matchet",    className: "bg-blue-100 text-blue-800 border-blue-200" },
  cancelled: { label: "Annulleret", className: "bg-red-100 text-red-800 border-red-200" },
  expired:   { label: "Udløbet",    className: "bg-gray-100 text-gray-600 border-gray-200" },
}

export default async function AdminAnmodningerPage() {
  const svc = createServiceClient()

  const { data: requests } = await svc
    .from("cabin_requests")
    .select(`
      id, location, desired_check_in, desired_check_out, num_guests,
      max_price_ore, status, created_at,
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
    profiles: { full_name: string | null } | null
  }

  const rows = (requests ?? []) as unknown as RequestRow[]

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Anmodninger</h1>
        <p className="text-gray-500 mt-1">{rows.length} hytteanmodninger (seneste 200)</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-semibold">Gæst</TableHead>
              <TableHead className="font-semibold">Destination</TableHead>
              <TableHead className="font-semibold">Check-in</TableHead>
              <TableHead className="font-semibold">Check-ud</TableHead>
              <TableHead className="font-semibold">Antal</TableHead>
              <TableHead className="font-semibold">Maks. budget</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Oprettet</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const st = statusLabel[r.status] ?? { label: r.status, className: "bg-gray-100 text-gray-600 border-gray-200" }
              return (
                <TableRow key={r.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium text-sm">
                    {r.profiles?.full_name ?? <span className="text-gray-400 italic">Ukendt</span>}
                  </TableCell>
                  <TableCell className="text-gray-700 text-sm capitalize">
                    {r.location || "—"}
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
                    <Badge className={`text-xs ${st.className}`}>
                      {st.label}
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
