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

/** Sanity Studio ligger uden for locale-prefix — må ikke køre gennem next-intl (ville omdirigere til /da/studio → 404). */
async function studioMiddleware(request: NextRequest) {
  let res = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          res = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = "/da"
    return NextResponse.redirect(url)
  }

  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle()

  if (!profile?.is_admin) {
    const url = request.nextUrl.clone()
    url.pathname = "/da"
    return NextResponse.redirect(url)
  }

  return res
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith("/studio")) {
    return studioMiddleware(request)
  }

  const intlResponse = handleI18nRouting(request)

  const status = intlResponse.status
  if (status === 301 || status === 302 || status === 307 || status === 308) {
    return intlResponse
  }

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

  const {
    data: { user },
  } = await supabase.auth.getUser()

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
    "/((?!api|auth|stripe|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
