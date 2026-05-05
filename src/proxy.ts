import createIntlMiddleware from "next-intl/middleware"
import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import { NextResponse, type NextRequest } from "next/server"
import { routing } from "./i18n/routing"

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

const handleI18nRouting = createIntlMiddleware(routing)

export async function proxy(request: NextRequest) {
  // Run next-intl locale routing first
  const intlResponse = handleI18nRouting(request)

  // If intl is redirecting (locale negotiation), return immediately
  const status = intlResponse.status
  if (status === 301 || status === 302 || status === 307 || status === 308) {
    return intlResponse
  }

  // Chain Supabase auth — start from intl response to preserve locale headers
  let supabaseResponse = intlResponse

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          // Preserve intl headers when creating the new response
          supabaseResponse = NextResponse.next({
            request,
            headers: intlResponse.headers,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // VIGTIGT: brug getUser() — ikke getSession() — for at validere JWT mod Supabase
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Strip locale prefix to get the raw path for route matching
  const localePattern = new RegExp(
    `^/(${routing.locales.join("|")})(/.*)?(\\?.*)?$`
  )
  const match = pathname.match(localePattern)
  const strippedPath = match ? (match[2] ?? "/") : pathname

  const isProtected =
    strippedPath.startsWith("/dashboard") ||
    strippedPath.startsWith("/admin") ||
    strippedPath.startsWith("/profil")

  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    if (strippedPath.startsWith("/profil")) {
      url.pathname = pathname.replace(strippedPath, "/login")
      url.searchParams.set("next", pathname)
    } else {
      url.pathname = pathname.replace(strippedPath, "/")
    }
    return NextResponse.redirect(url)
  }

  // Admin-ruter: kræver is_admin = true på profiles-rækken
  if (strippedPath.startsWith("/admin") && user) {
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle()

    if (!profile?.is_admin) {
      const url = request.nextUrl.clone()
      url.pathname = pathname.replace(strippedPath, "/")
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // Match all page routes — skip API, auth callbacks, Stripe, static files
    "/((?!api|auth|stripe|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
