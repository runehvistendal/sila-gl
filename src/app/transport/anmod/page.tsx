import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase-server"
import { getNavUserForPage } from "@/lib/getNavUser"
import { getAllLocationsSorted } from "@/lib/greenlandLocations"
import Navbar from "@/components/layout/Navbar"
import AnmodForm from "./AnmodForm"

export const metadata = {
  title: "Anmod om transport — Sila.gl",
}

export default async function AnmodPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login?next=/transport/anmod")

  const navUser = await getNavUserForPage(supabase, user)
  const locations = getAllLocationsSorted().map((l) => ({
    name: l.name_dk,
    isHub: l.is_major_hub,
  }))

  return (
    <main className="min-h-screen bg-background">
      <Navbar user={navUser} />
      <div className="pt-20 pb-16 max-w-xl mx-auto px-4 sm:px-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-1">Anmod om transport</h1>
          <p className="text-muted-foreground text-sm">
            Fortæl lokale sejlere hvad du har brug for — de svarer med tilbud.
          </p>
        </div>
        <AnmodForm locations={locations} />
      </div>
    </main>
  )
}
