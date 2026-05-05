'use server'

import { createClient } from "@/lib/supabase-server"

export async function updateLanguage(language: 'da' | 'en') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('profiles').update({ language }).eq('id', user.id)
}
