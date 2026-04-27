import Link from "next/link"
import { redirect } from "next/navigation"
import { Home, Anchor, CalendarDays, Ship } from "lucide-react"
import { createClient } from "@/lib/supabase-server"
import Navbar from "@/components/layout/Navbar"

export const metadata = {
  title: "Opret — Sila.gl",
}

export default async function OpretPage() {
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

      <div className="mx-auto max-w-xl px-4 pt-10 pb-20">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Hvad vil du oprette?
          </h1>
          <p className="text-sm text-muted-foreground">
            Vælg hvad du vil tilbyde rejsende i Grønland
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ChoiceCard
            href="/opret/hytte"
            icon={<Home className="w-5 h-5 text-primary" />}
            title="Opret ny hytte"
            description="Registrér din hytte som aktiv"
          />
          <ChoiceCard
            href="/opret/baad"
            icon={<Anchor className="w-5 h-5 text-primary" />}
            title="Opret ny båd"
            description="Registrér din båd som aktiv"
          />
          <ChoiceCard
            href="/dashboard?tab=mine-opslag"
            icon={<CalendarDays className="w-5 h-5 text-primary" />}
            title="Udlej en hytte"
            description="Vælg hytte og sæt datoer"
          />
          <ChoiceCard
            href="/dashboard?tab=mine-opslag"
            icon={<Ship className="w-5 h-5 text-primary" />}
            title="Post en sejladstur"
            description="Vælg båd og sæt afgangsdetaljer"
          />
        </div>
      </div>
    </main>
  )
}

function ChoiceCard({
  href,
  icon,
  title,
  description,
}: {
  href: string
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-4 border-2 border-border rounded-2xl p-6 bg-white hover:border-primary/30 transition-all shadow-sm"
    >
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <p className="font-bold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
      </div>
    </Link>
  )
}
