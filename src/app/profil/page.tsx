import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase-server"
import { getNavUserForPage } from "@/lib/getNavUser"
import Navbar from "@/components/layout/Navbar"
import ProfileForm, { type ProfileInitial } from "./ProfileForm"

export const metadata = { title: "Min profil — Sila.gl" }

export const dynamic = "force-dynamic"

export default async function ProfilPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login?next=%2Fprofil")
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      "full_name, role_type, location_id, language, location, avatar_url",
    )
    .eq("id", user.id)
    .maybeSingle()

  if (profileError) {
    console.error("[profil]", profileError)
    return (
      <main
        className="min-h-screen flex flex-col items-center justify-center px-4"
        style={{ backgroundColor: "#09192A" }}
      >
        <p className="text-center text-red-200 text-sm max-w-md">
          Kunne ikke hente profil ({profileError.message}). Kør{" "}
          <code className="text-white/90">supabase db push</code> hvis migration for{" "}
          <code className="text-white/90">location_id</code> / <code className="text-white/90">language</code>{" "}
          mangler.
        </p>
      </main>
    )
  }

  if (!profile) {
    redirect("/login?next=%2Fprofil")
  }

  const roleRaw = (profile as { role_type?: string }).role_type ?? "traveler"
  const roleType: ProfileInitial["role_type"] =
    roleRaw === "provider" || roleRaw === "both" || roleRaw === "traveler"
      ? roleRaw
      : "traveler"

  const langs = (profile as { languages?: string[] | null }).languages
  const langRaw = (profile as { language?: string | null }).language
  let language: ProfileInitial["language"] = "da"
  if (langRaw === "en" || langRaw === "kl" || langRaw === "da") {
    language = langRaw
  } else {
    const first = langs?.[0]
    if (first === "en" || first === "kl" || first === "da") language = first
  }

  const locId = (profile as { location_id?: string | null }).location_id ?? null

  const initial: ProfileInitial = {
    full_name: (profile as { full_name: string }).full_name ?? "Sila-bruger",
    location_id: locId,
    language,
    role_type: roleType,
    avatar_url: (profile as { avatar_url?: string | null }).avatar_url ?? null,
  }

  const navUser = await getNavUserForPage(supabase, user)

  return (
    <main
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "#09192A" }}
    >
      <Navbar user={navUser} />
      <div className="flex-1 pt-20 pb-16 px-4">
        <h1
          className="text-2xl font-bold text-center text-white mb-10 max-w-lg mx-auto"
          style={{ fontFamily: "var(--font-jakarta, system-ui)" }}
        >
          Min profil
        </h1>
        <ProfileForm initial={initial} />
      </div>
    </main>
  )
}
