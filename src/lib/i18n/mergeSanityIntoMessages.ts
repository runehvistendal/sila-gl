/* eslint-disable @typescript-eslint/no-explicit-any */
/** Deep-cloner JSON message-træ (bundled fallback). */
export type MessagesTree = Record<string, unknown>

function clone<T>(v: T): T {
  return typeof structuredClone === "function"
    ? structuredClone(v)
    : (JSON.parse(JSON.stringify(v)) as T)
}

/** Sæt leaf-string via dot-sti (fx home.howItWorks.title). */
export function setMessageAtPath(root: MessagesTree, dotPath: string, value: string): void {
  const parts = dotPath.split(".").filter(Boolean)
  if (parts.length === 0) return
  let cur: unknown = root
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i]
    const o = cur as MessagesTree
    const next = o[p]
    if (next === undefined || typeof next !== "object" || next === null || Array.isArray(next)) {
      o[p] = {}
    }
    cur = o[p]
  }
  const last = parts[parts.length - 1]
  const parent = cur as MessagesTree
  parent[last] = value
}

/** Navngivne globalSettings-felter → eksisterende message-sti (bundled). */
const SEMANTIC: { field: string; path: string }[] = [
  { field: "navHytter", path: "nav.cabins" },
  { field: "navTransport", path: "nav.transport" },
  { field: "btnSearch", path: "common.search" },
  { field: "btnBook", path: "common.book" },
  { field: "btnCreate", path: "nav.createListing" },
  { field: "btnReadMore", path: "common.show_more" },
  { field: "btnBack", path: "common.back" },
  { field: "btnSave", path: "common.save" },
  { field: "btnCancel", path: "common.cancel" },
  { field: "btnConfirm", path: "common.confirm" },
  { field: "btnContact", path: "footer.contact" },
  { field: "footerCopyright", path: "footer.copyright" },
  { field: "footerSlogan", path: "footer.slogan" },
  { field: "footerLinksTitle", path: "footer.platforms" },
  { field: "footerBrand", path: "footer.brandName" },
  { field: "heroHeading", path: "home.headline" },
  { field: "heroSubheading", path: "home.subheadline" },
  { field: "heroCtaLabel", path: "home.searchButton" },
  { field: "heroSearchPlaceholder", path: "home.searchPlaceholder" },
  { field: "heroBadge", path: "home.badge" },
]

function pickLocale<T extends Record<string, any>>(doc: T | null | undefined, base: string, locale: string): string | undefined {
  if (!doc) return undefined
  const lc = locale === "en" ? "en" : "da"
  const v = doc[`${base}_${lc}`] ?? doc[`${base}_da`]
  return typeof v === "string" && v.trim().length > 0 ? v : undefined
}

export function mergeSanityIntoMessages(
  baseMessages: MessagesTree,
  settings: Record<string, unknown> | null | undefined,
  locale: string,
): MessagesTree {
  const out = clone(baseMessages)

  for (const { field, path } of SEMANTIC) {
    const text = pickLocale(settings as any, field, locale)
    if (text) setMessageAtPath(out, path, text)
  }

  const tagline = pickLocale(settings as any, "footerTagline", locale)
  if (tagline) setMessageAtPath(out, "footer.tagline", tagline)

  const overrides = (settings as any)?.stringOverrides as
    | { keyPath?: string; da?: string; en?: string }[]
    | undefined
  if (Array.isArray(overrides)) {
    for (const row of overrides) {
      const kp = row.keyPath?.trim()
      if (!kp) continue
      const val =
        locale === "en"
          ? (row.en?.trim() || row.da?.trim())
          : (row.da?.trim() || row.en?.trim())
      if (val) setMessageAtPath(out, kp, val)
    }
  }

  return out
}
