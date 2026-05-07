import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase-server"
import { getNavUserForPage } from "@/lib/getNavUser"
import Navbar from "@/components/layout/Navbar"
import HytteOpslagForm from "./HytteOpslagForm"
import { getLocationName } from "@/lib/greenlandLocations"

export const metadata = {
  title: "Publicér hytte — Sila.gl",
}

export default async function HytteOpslagPage({
  params,
}: {
  params: Promise<{ cabinId: string }>
}) {
  const { cabinId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/")

  const { data: cabin } = await supabase
    .from("cabins")
    .select("id, owner_id, title, location_hub, price_per_night_ore, cleaning_fee_ore")
    .eq("id", cabinId)
    .eq("owner_id", user.id)
    .single()

  if (!cabin) redirect("/dashboard?tab=mine-opslag")

  const navUser = await getNavUserForPage(supabase, user)

  return (
    <main className="min-h-screen bg-background">
      <Navbar user={navUser} />

      <div className="mx-auto max-w-xl px-4 pt-24 pb-20">
        {/* Info header */}
        <div className="mb-6 bg-white rounded-2xl border border-border shadow-sm p-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Du udlejer
          </p>
          <p className="text-lg font-bold text-foreground">
            {cabin.title}
            <span className="font-normal text-muted-foreground"> — {getLocationName(cabin.location_hub)}</span>
          </p>
        </div>

        <HytteOpslagForm cabin={cabin} />
      </div>
    </main>
  )
}
