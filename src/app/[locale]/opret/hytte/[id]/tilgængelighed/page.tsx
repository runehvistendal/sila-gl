import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase-server"
import { getNavUserForPage } from "@/lib/getNavUser"
import Navbar from "@/components/layout/Navbar"
import AvailabilityCalendar from "./AvailabilityCalendar"

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  void id
  return { title: `Tilgængelighed — Sila.gl` }
}

export default async function TilgængelighedPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: cabinId } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/")

  const navUser = await getNavUserForPage(supabase, user)

  const { data: cabin } = await supabase
    .from("cabins")
    .select("id, title, published")
    .eq("id", cabinId)
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .maybeSingle()

  if (!cabin) notFound()

  // Fetch blocked dates (is_available = false)
  const { data: blockedRows } = await supabase
    .from("cabin_availability")
    .select("date")
    .eq("cabin_id", cabinId)
    .eq("is_available", false)

  const initialBlocked = (blockedRows ?? []).map((r) => r.date as string)

  // Booked dates (confirmed + pending bookings in the future)
  const today = new Date().toISOString().split("T")[0]
  const { data: bookingRows } = await supabase
    .from("cabin_bookings")
    .select("check_in, check_out")
    .eq("cabin_id", cabinId)
    .in("status", ["confirmed", "pending"])
    .gte("check_out", today)
    .is("deleted_at", null)

  const bookedDates: string[] = []
  for (const b of bookingRows ?? []) {
    const cur = new Date(b.check_in)
    const end = new Date(b.check_out)
    while (cur < end) {
      bookedDates.push(cur.toISOString().split("T")[0])
      cur.setDate(cur.getDate() + 1)
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <Navbar user={navUser} />

      <div className="mx-auto max-w-2xl px-4 pt-20 pb-20">
        <div className="mb-8">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
            Trin 2 af 2
          </p>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Tilgængelighed
          </h1>
          <p className="text-sm text-muted-foreground">
            Klik for at blokere datoer — alle datoer er ledige som standard.
          </p>
          <p className="text-sm font-medium text-foreground mt-2">{cabin.title}</p>
        </div>

        <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
          <AvailabilityCalendar
            cabinId={cabinId}
            initialBlocked={initialBlocked}
            bookedDates={bookedDates}
          />
        </div>
      </div>
    </main>
  )
}
