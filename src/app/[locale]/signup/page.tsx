import { createClient } from "@/lib/supabase-server"
import { getNavUserForPage } from "@/lib/getNavUser"
import Navbar from "@/components/layout/Navbar"
import SignupForm from "./SignupForm"

export default async function SignupPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const navUser = user ? await getNavUserForPage(supabase, user) : null

  return (
    <main className="min-h-screen flex flex-col" style={{ backgroundColor: "#09192A" }}>
      <Navbar user={navUser} />
      <div className="flex-1 flex items-center justify-center px-4 pt-20 pb-12">
        <SignupForm />
      </div>
    </main>
  )
}
