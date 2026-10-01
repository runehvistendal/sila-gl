/** Offentlig base-URL (Stripe redirects, m.m.) */
export function getAppBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_BASE_URL?.trim() || "http://localhost:3000"
  return raw.replace(/\/$/, "")
}

/** Absolut app-URL med locale-prefix (fx mails, dybe links). */
export function getLocaleUrl(locale: string, path: string): string {
  const base = getAppBaseUrl()
  const loc =
    (locale || "da").trim().replace(/^\/+|\/+$/g, "") || "da"
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  return `${base}/${loc}${normalizedPath}`
}
