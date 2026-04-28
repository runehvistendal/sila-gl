import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase-server"
import { getNavUserForPage } from "@/lib/getNavUser"
import Navbar from "@/components/layout/Navbar"
import OpretForm from "./OpretForm"

export const metadata = { title: "Tilbyd samsejlads — Sila.gl" }

export default async function OpretSamsejladsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login?next=/samsejlads/opret")

  const navUser = await getNavUserForPage(supabase, user)

  return (
    <main className="min-h-screen bg-background">
      <Navbar user={navUser} />

      <div className="max-w-lg mx-auto px-4 pt-24 pb-16">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Tilbyd samsejlads</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Del din sejltur og lad andre rejse med. Sila tager 15 % i kommission.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-border p-6">
          <OpretForm />
        </div>
      </div>
    </main>
  )
}
