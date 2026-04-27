import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase-server"
import { getNavUserForPage } from "@/lib/getNavUser"
import Navbar from "@/components/layout/Navbar"
import HytteForm from "./HytteForm"

export const metadata = {
  title: "Registrér hytte — Sila.gl",
}

export default async function OpretHyttePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/")

  const navUser = await getNavUserForPage(supabase, user.id)

  return (
    <main className="min-h-screen bg-background">
      <Navbar user={navUser} />

      <div className="mx-auto max-w-xl px-4 pt-16 pb-20">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Registrér hytte
          </h1>
          <p className="text-sm text-muted-foreground">
            Udfyld oplysningerne om din hytte. Billeder og publicering sker i næste trin.
          </p>
        </div>

        <HytteForm mode="create" />
      </div>
    </main>
  )
}
