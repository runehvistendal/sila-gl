import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase-server"
import Navbar from "@/components/layout/Navbar"
import SejladsOpslagForm from "./SejladsOpslagForm"

export const metadata = {
  title: "Post sejladstur — Sila.gl",
}

export default async function SejladsOpslagPage({
  params,
}: {
  params: Promise<{ boatId: string }>
}) {
  const { boatId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/")

  const { data: boat } = await supabase
    .from("boats")
    .select("id, owner_id, name, boat_type, capacity")
    .eq("id", boatId)
    .eq("owner_id", user.id)
    .single()

  if (!boat) redirect("/dashboard?tab=mine-opslag")

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

      <div className="mx-auto max-w-xl px-4 pt-24 pb-20">
        {/* Info header */}
        <div className="mb-6 bg-white rounded-2xl border border-border shadow-sm p-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Du poster tur med
          </p>
          <p className="text-lg font-bold text-foreground">
            {boat.name}
            <span className="font-normal text-muted-foreground">
              {" "}— {boat.boat_type ?? "Båd"}
            </span>
          </p>
        </div>

        <SejladsOpslagForm boat={boat} />
      </div>
    </main>
  )
}
