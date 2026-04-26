import { createClient } from "@/lib/supabase-server"
import Navbar from "@/components/layout/Navbar"
import SignupForm from "./SignupForm"

export default async function SignupPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const navUser = user
    ? {
        id: user.id,
        email: user.email ?? null,
        name:
          (user.user_metadata?.full_name as string) ??
          (user.user_metadata?.name as string) ??
          null,
      }
    : null

  return (
    <main className="min-h-screen flex flex-col" style={{ backgroundColor: "#09192A" }}>
      <Navbar user={navUser} />
      <div className="flex-1 flex items-center justify-center px-4 pt-20 pb-12">
        <SignupForm />
      </div>
    </main>
  )
}
