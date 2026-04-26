import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase-server"
import Navbar from "@/components/layout/Navbar"
import { Plus } from "lucide-react"
import MineHytterList, { type Hytte } from "./MineHytterList"

export const metadata = {
  title: "Mine hytter — Sila.gl",
}

export default async function MineHytterPage() {
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

  const { data, error } = await supabase
    .from("cabins")
    .select(
      "id, title, location_hub, price_per_night_ore, published, instant_book, access_type, max_guests, created_at"
    )
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[mine-hytter] Supabase fetch error:", error)
  }

  const cabins: Hytte[] = (data ?? []) as Hytte[]

  return (
    <main className="min-h-screen bg-background">
      <Navbar user={navUser} />

      <div className="mx-auto max-w-4xl px-4 pt-10 pb-20">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground md:text-3xl">
              Mine hytter
            </h1>
            {cabins.length > 0 && (
              <p className="mt-1 text-sm text-muted-foreground">
                {cabins.length} {cabins.length === 1 ? "hytte" : "hytter"} i alt
                {" — "}
                {cabins.filter((c) => c.published).length} aktive,{" "}
                {cabins.filter((c) => !c.published).length} kladder
              </p>
            )}
          </div>

          <Link
            href="/opret"
            className="inline-flex shrink-0 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">Opret ny hytte</span>
            <span className="sm:hidden">Ny hytte</span>
          </Link>
        </div>

        {/* List */}
        <MineHytterList cabins={cabins} />
      </div>
    </main>
  )
}
