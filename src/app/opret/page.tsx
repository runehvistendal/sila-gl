import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase-server"
import { getNavUserForPage } from "@/lib/getNavUser"
import Navbar from "@/components/layout/Navbar"
import OpretPageClient, {
  type CabinRow,
  type BoatRow,
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

  const navUser = await getNavUserForPage(supabase, user.id)

  const [{ data: cabinsRaw }, { data: boatsRaw }] = await Promise.all([
    supabase
      .from("cabins")
      .select("id, title, location_hub, published")
      .eq("owner_id", user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("boats")
      .select("id, name, boat_type, capacity")
      .eq("owner_id", user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
  ])

  const cabins = (cabinsRaw ?? []) as CabinRow[]
  const boats = (boatsRaw ?? []) as BoatRow[]

  return (
    <main className="min-h-screen bg-background">
      <Navbar user={navUser} />
      <OpretPageClient cabins={cabins} boats={boats} />
    </main>
  )
}
