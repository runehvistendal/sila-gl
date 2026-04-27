/** Offentlig base-URL (Stripe redirects, m.m.) */
export function getAppBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_BASE_URL?.trim() || "http://localhost:3000"
  return raw.replace(/\/$/, "")
}
