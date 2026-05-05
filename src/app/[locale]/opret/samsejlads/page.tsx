import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase-server"
import { getNavUserForPage } from "@/lib/getNavUser"
import Navbar from "@/components/layout/Navbar"
import SamsejladsForm from "./SamsejladsForm"

export const metadata = { title: "Opret samsejladstur — Sila.gl" }
export const dynamic = "force-dynamic"

export default async function OpretSamsejladsPage({
  searchParams,
}: {
  searchParams: Promise<{ baadId?: string }>
}) {
  const { baadId } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/")

  const navUser = await getNavUserForPage(supabase, user)

  const { data: boatsRaw } = await supabase
    .from("boats")
    .select("id, name, boat_type, capacity")
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })

  const boats = (boatsRaw ?? []) as {
    id: string
    name: string
    boat_type: string | null
    capacity: number
  }[]

  return (
    <main className="min-h-screen bg-background">
      <Navbar user={navUser} />

      <div className="mx-auto max-w-xl px-4 pt-20 pb-20">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Opret samsejladstur
          </h1>
          <p className="text-sm text-muted-foreground">
            Vælg din båd, rute og dato. Tidspunkter angives i lokal tid.
          </p>
        </div>

        <SamsejladsForm boats={boats} defaultBoatId={baadId} />
      </div>
    </main>
  )
}
