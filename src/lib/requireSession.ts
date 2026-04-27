import { createClient } from "@/lib/supabase-server"
import type { Session, User } from "@supabase/supabase-js"

/**
 * Verificeret session (CSRF-mønster for server actions).
 * Kast hvis ingen session — kald kun efter brugerflow der kræver login.
 */
export async function requireSession(): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>
  session: Session
  user: User
}> {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) {
    throw new Error("Ikke logget ind")
  }
  return { supabase, session, user: session.user }
}
