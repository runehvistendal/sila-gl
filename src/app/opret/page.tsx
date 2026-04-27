import Link from "next/link"
import { redirect } from "next/navigation"
import { Home, Anchor } from "lucide-react"
import { createClient } from "@/lib/supabase-server"
import Navbar from "@/components/layout/Navbar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export const metadata = {
  title: "Opret — Sila.gl",
}

interface CabinRow {
  id: string
  title: string
  location_hub: string
  published: boolean
}

interface BoatRow {
  id: string
  name: string
  boat_type: string | null
  capacity: number
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

  const [{ data: cabinsRaw }, { data: boatsRaw }] = await Promise.all([
    supabase
      .from("cabins")
      .select("id, title, location_hub, published")
      .eq("owner_id", user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("boats")
      .select("id, name, boat_type, capacity")
      .eq("owner_id", user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
  ])

  const cabins = (cabinsRaw ?? []) as CabinRow[]
  const boats = (boatsRaw ?? []) as BoatRow[]

  if (cabins.length === 0 && boats.length === 0) {
    redirect("/opret/hytte")
  }

  return (
    <main className="min-h-screen bg-background">
      <Navbar user={navUser} />

      <div className="mx-auto max-w-2xl px-4 pt-10 pb-20">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Hvad vil du oprette?
          </h1>
          <p className="text-sm text-muted-foreground">
            Vælg hytteudlejning eller transport — eller spring direkte til dine aktiver
            nedenfor.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <section className="border-2 border-border rounded-2xl p-5 sm:p-6 bg-white flex flex-col gap-3 min-h-0 min-w-0">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg shrink-0">
              🏠
            </div>
            <div>
              <h2 className="font-bold text-foreground">Udlej en hytte</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Tilbyd din hytte til rejsende
              </p>
            </div>
            {cabins.length === 0 ? (
              <p className="text-sm text-muted-foreground">Du har endnu ingen hytter.</p>
            ) : (
              <ul className="space-y-2 border-t border-border pt-3 break-words">
                {cabins.map((c) => (
                  <li
                    key={c.id}
                    className="flex flex-col gap-2 rounded-xl border border-border p-3 bg-muted/20"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground break-words">{c.title}</p>
                      <p className="text-xs text-muted-foreground break-words">{c.location_hub}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        className={
                          c.published
                            ? "bg-green-100 text-green-800 border-0"
                            : "bg-gray-100 text-gray-600 border-0"
                        }
                      >
                        {c.published ? "Aktiv" : "Kladde"}
                      </Badge>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="rounded-lg text-xs h-8"
                        >
                          <Link href={`/opret/hytte/${c.id}/rediger`}>Rediger</Link>
                        </Button>
                        <Button
                          asChild
                          size="sm"
                          className="rounded-lg text-xs h-8"
                        >
                          <Link href={`/opret/opslag/hytte/${c.id}`}>Udlej denne</Link>
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="pt-1">
              <Link
                href="/opret/hytte"
                className="text-sm font-medium text-primary hover:underline"
              >
                + Opret ny hytte
              </Link>
            </div>
          </section>

          <section className="border-2 border-border rounded-2xl p-5 sm:p-6 bg-white flex flex-col gap-3 min-h-0 min-w-0">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Anchor className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-foreground">Tilbyd transport</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Tilbyd pladser på din båd
              </p>
            </div>
            {boats.length === 0 ? (
              <p className="text-sm text-muted-foreground">Du har endnu ingen både.</p>
            ) : (
              <ul className="space-y-2 border-t border-border pt-3 break-words">
                {boats.map((b) => (
                  <li
                    key={b.id}
                    className="flex flex-col gap-2 rounded-xl border border-border p-3 bg-muted/20"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground break-words">{b.name}</p>
                      <p className="text-xs text-muted-foreground break-words">
                        {b.boat_type ?? "Båd"} — {b.capacity} pladser
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="rounded-lg text-xs h-8"
                      >
                        <Link href={`/opret/baad/${b.id}/rediger`}>Rediger</Link>
                      </Button>
                      <Button asChild size="sm" className="rounded-lg text-xs h-8">
                        <Link href={`/opret/opslag/sejlads/${b.id}`}>Post tur</Link>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="pt-1">
              <Link
                href="/opret/baad"
                className="text-sm font-medium text-primary hover:underline"
              >
                + Opret ny båd
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
