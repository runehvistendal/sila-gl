import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase-server"
import { getNavUserForPage } from "@/lib/getNavUser"
import Navbar from "@/components/layout/Navbar"
import AvailabilityCalendar from "./AvailabilityCalendar"

export const dynamic = "force-dynamic"

export async function generateMetadata() {
  return { title: "Tilgængelighed — Sila.gl" }
}

export default async function TilgaengelighedPage({
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
    .select("id, title, published, min_nights, preparation_days")
    .eq("id", cabinId)
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .maybeSingle()

  if (!cabin) notFound()

  const { data: availabilityRows } = await supabase
    .from("cabin_availability")
    .select("date")
    .eq("cabin_id", cabinId)
    .eq("is_available", false)

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

  const initialBlocked = (availabilityRows ?? []).map((r) => r.date as string)
  const isPublished = (cabin as { published: boolean }).published
  const minNights = (cabin as { min_nights: number }).min_nights ?? 1
  const preparationDays = (cabin as { preparation_days: number }).preparation_days ?? 0

  return (
    <main className="min-h-screen bg-background">
      <Navbar user={navUser} />

      <div className="mx-auto max-w-2xl px-4 pt-20 pb-20">
        <div className="mb-8">
          {!isPublished && (
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              Trin 2 af 2
            </p>
          )}
          <h1 className="text-2xl font-bold text-foreground mb-1">
            Administrér tilgængelighed
          </h1>
          <p className="text-sm font-medium text-foreground mb-6">{cabin.title}</p>

          <div className="rounded-xl border border-[#4A9CC7]/30 bg-[#4A9CC7]/8 px-4 py-4 text-sm text-[#1a5f7a]">
            <p className="font-semibold mb-1">Din hytte er som standard ledig alle dage.</p>
            <p>
              Klik på de datoer du vil blokere — fx når du selv bruger hytten eller ikke ønsker gæster.
              Bookede datoer låses automatisk.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
          <AvailabilityCalendar
            cabinId={cabinId}
            initialBlocked={initialBlocked}
            bookedDates={bookedDates}
            initialMinNights={minNights}
            initialPreparationDays={preparationDays}
            showPublishButton={!isPublished}
          />
        </div>
      </div>
    </main>
  )
}
