import { Suspense } from "react"
import { createClient } from "@/lib/supabase-server"
import { getNavUserForPage } from "@/lib/getNavUser"
import Navbar from "@/components/layout/Navbar"
import LoginForm from "./LoginForm"

export const metadata = { title: "Log ind — Sila.gl" }

export default async function LoginPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const navUser = user ? await getNavUserForPage(supabase, user) : null

  return (
    <main
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "#09192A" }}
    >
      <Navbar user={navUser} />
      <div className="flex-1 flex items-center justify-center px-4 pt-20 pb-12">
        <Suspense fallback={<div className="text-white/80 text-sm">Indlæser…</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  )
}
