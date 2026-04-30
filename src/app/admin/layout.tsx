import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase-server"
import { createServiceClient } from "@/lib/supabase-service"
import AdminSidebar from "@/components/admin/AdminSidebar"

export const dynamic = "force-dynamic"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/")

  // Double-check admin status in layout as defence in depth (middleware also checks)
  const svc = createServiceClient()
  const { data: profile } = await svc
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle()

  if (!profile?.is_admin) redirect("/")

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
