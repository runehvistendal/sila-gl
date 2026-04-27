import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase-server"
import Navbar from "@/components/layout/Navbar"
import BaadForm from "./BaadForm"

export const metadata = {
  title: "Registrér båd — Sila.gl",
}

export default async function OpretBaadPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/")

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
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Registrér båd
          </h1>
          <p className="text-sm text-muted-foreground">
            Udfyld oplysningerne om din båd. Billeder og publicering sker i næste trin.
          </p>
        </div>

        <BaadForm mode="create" />
      </div>
    </main>
  )
}
