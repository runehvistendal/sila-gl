import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase-server"
import { getNavUserForPage } from "@/lib/getNavUser"
import Navbar from "@/components/layout/Navbar"
import HytteForm, { type InitialCabin } from "../../HytteForm"
import CabinOwnerCalendar from "@/components/cabins/CabinOwnerCalendar"

export const metadata = { title: "Rediger hytte — Sila.gl" }

export default async function RedigerHyttePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/")

  const { data: cabin, error } = await supabase
    .from("cabins")
    .select(
      "id, title, description, location_hub, max_guests, bedrooms, facilities, addon_services, offers_transport, transport_from, transport_price_roundtrip_ore, owner_id, images",
    )
    .eq("id", id)
    .is("deleted_at", null)
    .single()

  if (error || !cabin) notFound()
  if (cabin.owner_id !== user.id) notFound()

  const [{ data: calBookings }, { data: calBlocks }] = await Promise.all([
    supabase
      .from("cabin_bookings")
      .select("check_in, check_out, status")
      .eq("cabin_id", id)
      .in("status", ["pending", "confirmed", "completed"])
      .is("deleted_at", null),
    supabase
      .from("cabin_availability")
      .select("date")
      .eq("cabin_id", id)
      .eq("is_available", false)
      .is("deleted_at", null),
  ])

  const manualBlockedYmd = (calBlocks ?? [])
    .map((r) => (r as { date: string }).date?.slice(0, 10))
    .filter(Boolean) as string[]

  const initialCabin: InitialCabin = {
    id: cabin.id,
    title: cabin.title,
    description: cabin.description,
    location_hub: cabin.location_hub,
    max_guests: cabin.max_guests,
    bedrooms: cabin.bedrooms,
    facilities: (cabin.facilities as string[] | null) ?? null,
    addon_services: cabin.addon_services,
    offers_transport: cabin.offers_transport,
    transport_from: cabin.transport_from,
    transport_price_roundtrip_ore: cabin.transport_price_roundtrip_ore,
    images: (cabin as { images?: string[] | null }).images ?? [],
  }

  const navUser = await getNavUserForPage(supabase, user)

  return (
    <main className="min-h-screen bg-background">
      <Navbar user={navUser} />

      <div className="mx-auto max-w-xl px-4 pt-16 pb-20">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">Rediger hytte</h1>
          <p className="text-sm text-muted-foreground">
            Opdatér oplysningerne — billeder og publicering sker i andre trin.
          </p>
        </div>

        <HytteForm mode="edit" initialCabin={initialCabin} key={cabin.id} />

        <div className="mt-10 max-w-2xl mx-auto">
          <CabinOwnerCalendar
            cabinId={cabin.id}
            bookings={
              (calBookings ?? []) as {
                check_in: string
                check_out: string
                status: string
              }[]
            }
            manualBlockedYmd={manualBlockedYmd}
          />
        </div>
      </div>
    </main>
  )
}
