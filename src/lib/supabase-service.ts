import { createClient } from "@supabase/supabase-js"

/**
 * Service role (bypasser RLS). Må KUN bruges server-side og til
 * snævre, kontrollerede operationer (fx egen bruger efter auth.check).
 */
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  )
}
