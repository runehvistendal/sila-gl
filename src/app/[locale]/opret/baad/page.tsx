import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { createClient } from "@/lib/supabase-server"
import { getNavUserForPage } from "@/lib/getNavUser"
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

  const navUser = await getNavUserForPage(supabase, user)
  const t = await getTranslations("create")

  return (
    <main className="min-h-screen bg-background">
      <Navbar user={navUser} />

      <div className="mx-auto max-w-xl px-4 pt-20 pb-20">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {t("register_boat")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("register_boat_subtitle")}
          </p>
        </div>

        <BaadForm mode="create" />
      </div>
    </main>
  )
}
