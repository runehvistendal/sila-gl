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

export const metadata = { title: "Bookinger — Admin" }
export const dynamic = "force-dynamic"

const statusLabel: Record<string, { label: string; className: string }> = {
  pending:   { label: "Afventer",    className: "bg-amber-100 text-amber-800 border-amber-200" },
  confirmed: { label: "Bekræftet",   className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  cancelled: { label: "Annulleret",  className: "bg-red-100 text-red-800 border-red-200" },
  expired:   { label: "Udløbet",     className: "bg-gray-100 text-gray-600 border-gray-200" },
  completed: { label: "Afsluttet",   className: "bg-blue-100 text-blue-800 border-blue-200" },
}

export default async function AdminBookingerPage() {
  const svc = createServiceClient()

  const { data: bookings } = await svc
    .from("cabin_bookings")
    .select(`
      id, status, check_in, check_out, num_guests, total_price_ore, created_at,
      cabins!cabin_id(title),
      profiles!guest_id(full_name)
    `)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(200)

  type BookingRow = {
    id: string
    status: string
    check_in: string
    check_out: string
    num_guests: number
    total_price_ore: number
    created_at: string
    cabins: { title: string } | null
    profiles: { full_name: string | null } | null
  }

  const rows = (bookings ?? []) as unknown as BookingRow[]

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Bookinger</h1>
        <p className="text-gray-500 mt-1">{rows.length} bookinger (seneste 200)</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-semibold">Hytte</TableHead>
              <TableHead className="font-semibold">Gæst</TableHead>
              <TableHead className="font-semibold">Check-in</TableHead>
              <TableHead className="font-semibold">Check-ud</TableHead>
              <TableHead className="font-semibold">Gæster</TableHead>
              <TableHead className="font-semibold">Beløb</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Oprettet</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((b) => {
              const st = statusLabel[b.status] ?? { label: b.status, className: "bg-gray-100 text-gray-600 border-gray-200" }
              return (
                <TableRow key={b.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium text-sm">
                    {b.cabins?.title ?? <span className="text-gray-400 italic">Ukendt</span>}
                  </TableCell>
                  <TableCell className="text-gray-600 text-sm">
                    {b.profiles?.full_name ?? <span className="text-gray-400 italic">Ukendt</span>}
                  </TableCell>
                  <TableCell className="text-gray-700 text-sm">
                    {new Date(b.check_in).toLocaleDateString("da-DK")}
                  </TableCell>
                  <TableCell className="text-gray-700 text-sm">
                    {new Date(b.check_out).toLocaleDateString("da-DK")}
                  </TableCell>
                  <TableCell className="text-gray-600 text-sm text-center">
                    {b.num_guests}
                  </TableCell>
                  <TableCell className="text-gray-700 text-sm font-medium">
                    {formatKr(b.total_price_ore)}
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-xs ${st.className}`}>
                      {st.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-500 text-sm">
                    {new Date(b.created_at).toLocaleDateString("da-DK")}
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
