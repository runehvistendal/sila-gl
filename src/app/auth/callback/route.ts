import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse, type NextRequest } from "next/server"

const SUPPORTED_LOCALES = ["da", "en"] as const
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

function stripLocale(path: string): string {
  const match = path.match(/^\/(da|en)(\/.*)?$/)
  return match ? (match[2] ?? "/") : path
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/"

  if (code) {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Fetch user's language preference and redirect to that locale
      const { data: { user } } = await supabase.auth.getUser()
      let locale: SupportedLocale = "da"

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("language")
          .eq("id", user.id)
          .single()

        const lang = profile?.language
        if (lang && SUPPORTED_LOCALES.includes(lang as SupportedLocale)) {
          locale = lang as SupportedLocale
        }
      }

      const rawPath = stripLocale(next)
      return NextResponse.redirect(`${origin}/${locale}${rawPath === "/" ? "" : rawPath}`)
    }
  }

  return NextResponse.redirect(`${origin}/da/?error=auth_callback_failed`)
}
