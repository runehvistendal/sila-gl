import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase-server"
import Navbar from "@/components/layout/Navbar"
import CreateHytteForm from "./CreateHytteForm"

export const metadata = {
  title: "Opret hytte — Sila.gl",
}

export default async function OpretHyttePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/")
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

      <div className="mx-auto max-w-xl px-4 pt-10 pb-20">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Opret hytte
          </h1>
          <p className="text-sm text-muted-foreground">
            Alle felter markeret med{" "}
            <span className="text-destructive">*</span> er påkrævede.
            Din hytte gemmes som kladde — du kan udgive den senere.
          </p>
        </div>

        <div className="rounded-2xl bg-card p-6 shadow-card border border-border">
          <CreateHytteForm />
        </div>
      </div>
    </main>
  )
}
