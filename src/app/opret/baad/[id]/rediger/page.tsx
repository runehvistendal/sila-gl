import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase-server"
import Navbar from "@/components/layout/Navbar"
import BaadForm, { type InitialBoat } from "../../BaadForm"

export const metadata = { title: "Rediger båd — Sila.gl" }

export default async function RedigerBaadPage({
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

  const { data: boat, error } = await supabase
    .from("boats")
    .select("id, name, boat_type, capacity, description, equipment, addon_services, owner_id")
    .eq("id", id)
    .is("deleted_at", null)
    .single()

  if (error || !boat) notFound()
  if (boat.owner_id !== user.id) notFound()

  const initialBoat: InitialBoat = {
    id: boat.id,
    name: boat.name,
    boat_type: boat.boat_type,
    capacity: boat.capacity,
    description: boat.description,
    equipment: (boat.equipment as string[] | null) ?? null,
    addon_services: boat.addon_services,
  }

  const navUser = {
    id: user.id,
    email: user.email ?? null,
    name:
      (user.user_metadata?.full_name as string) ??
      (user.user_metadata?.name as string) ??
      null,
  }

  return (
    <main className="min-h-screen bg-background">
      <Navbar user={navUser} />

      <div className="mx-auto max-w-xl px-4 pt-16 pb-20">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">Rediger båd</h1>
          <p className="text-sm text-muted-foreground">
            Opdatér oplysningerne — billeder og ture håndteres andre steder.
          </p>
        </div>

        <BaadForm mode="edit" initialBoat={initialBoat} key={boat.id} />
      </div>
    </main>
  )
}
