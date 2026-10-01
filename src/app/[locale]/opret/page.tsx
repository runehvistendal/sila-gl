import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase-server"
import { getNavUserForPage } from "@/lib/getNavUser"
import Navbar from "@/components/layout/Navbar"
import OpretPageClient, {
  type BoatRow,
  type CabinRow,
  type ExperienceRow,
} from "./OpretPageClient"

export const metadata = {
  title: "Opret — Sila.gl",
}

export default async function OpretPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/")

  const navUser = await getNavUserForPage(supabase, user)

  const [{ data: cabinsRaw }, { data: boatsRaw }, { data: experiencesRaw }] =
    await Promise.all([
      supabase
        .from("cabins")
        .select("id, title, location_hub, published, property_type, images")
        .eq("owner_id", user.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("boats")
        .select("id, name, boat_type, capacity, images")
        .eq("owner_id", user.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("experiences")
        .select("id, title, images, published")
        .eq("provider_id", user.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
    ])

  const cabins = (cabinsRaw ?? []) as CabinRow[]
  const boats = (boatsRaw ?? []) as BoatRow[]
  const experiences = (experiencesRaw ?? []) as ExperienceRow[]

  return (
    <main className="min-h-screen bg-background">
      <Navbar user={navUser} />
      <OpretPageClient cabins={cabins} boats={boats} experiences={experiences} />
    </main>
  )
}
