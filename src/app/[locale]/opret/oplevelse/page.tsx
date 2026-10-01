import { createClient } from "@/lib/supabase-server"
import { getNavUserForPage } from "@/lib/getNavUser"
import Navbar from "@/components/layout/Navbar"
import { redirect } from "next/navigation"
import { setRequestLocale } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { ChevronLeft } from "lucide-react"
import OplevelsesForm from "./OplevelsesForm"

export const metadata = {
  title: "Tilbyd en oplevelse — Sila.gl",
}

export const dynamic = "force-dynamic"

export default async function OpretOplevelsePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/")

  const navUser = await getNavUserForPage(supabase, user)

  return (
    <main className="min-h-screen bg-background">
      <Navbar user={navUser} />

      <div className="mx-auto max-w-xl px-4 pt-20 pb-20">
        <Link
          href="/opret"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" aria-hidden />
          Tilbage til Opret
        </Link>

        <div className="mb-8">
          <h1 className="mb-2 text-2xl font-bold text-foreground">Tilbyd en oplevelse</h1>
        </div>

        <OplevelsesForm />
      </div>
    </main>
  )
}
