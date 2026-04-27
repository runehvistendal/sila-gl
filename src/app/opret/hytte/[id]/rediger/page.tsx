import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase-server"
import { getNavUserForPage } from "@/lib/getNavUser"
import Navbar from "@/components/layout/Navbar"
import HytteForm, { type InitialCabin } from "../../HytteForm"

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
      </div>
    </main>
  )
}
