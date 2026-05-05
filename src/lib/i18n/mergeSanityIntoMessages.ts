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
  { field: "navLogoText", path: "nav.logoText" },
  { field: "navAriaOpenMenu", path: "nav.ariaOpenMenu" },
  { field: "navAriaCloseMenu", path: "nav.ariaCloseMenu" },
  { field: "navLocaleRowDa", path: "nav.localeRowDa" },
  { field: "navLocaleRowEn", path: "nav.localeRowEn" },
  { field: "navProfileAvatarAlt", path: "nav.profileAvatarAlt" },
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
  { field: "heroImageAlt", path: "home.heroImageAlt" },
  { field: "homeHowItWorksTitle", path: "home.howItWorks.title" },
  { field: "homeHowItWorksSubtitle", path: "home.howItWorks.subtitle" },
  { field: "homeHowItWorksStepLabel", path: "home.howItWorks.step" },
  { field: "homeHowItWorksStep0Title", path: "home.howItWorks.steps.0.title" },
  { field: "homeHowItWorksStep0Desc", path: "home.howItWorks.steps.0.desc" },
  { field: "homeHowItWorksStep1Title", path: "home.howItWorks.steps.1.title" },
  { field: "homeHowItWorksStep1Desc", path: "home.howItWorks.steps.1.desc" },
  { field: "homeHowItWorksStep2Title", path: "home.howItWorks.steps.2.title" },
  { field: "homeHowItWorksStep2Desc", path: "home.howItWorks.steps.2.desc" },
  { field: "homeCabinsTitle", path: "home.cabinsSection.title" },
  { field: "homeCabinsSubtitle", path: "home.cabinsSection.subtitle" },
  { field: "homeCabinsSeeAll", path: "home.cabinsSection.seeAll" },
  { field: "homeCabinsSeeAllCabins", path: "home.cabinsSection.seeAllCabins" },
  { field: "homeCabinsPerNight", path: "home.cabinsSection.perNight" },
  { field: "homeSailUniqueLabel", path: "home.sailSection.uniqueLabel" },
  { field: "homeSailTitle", path: "home.sailSection.title" },
  { field: "homeSailTitleHighlight", path: "home.sailSection.titleHighlight" },
  { field: "homeSailDesc", path: "home.sailSection.desc" },
  { field: "homeSailFeature0Label", path: "home.sailSection.features.0.label" },
  { field: "homeSailFeature0Desc", path: "home.sailSection.features.0.desc" },
  { field: "homeSailFeature1Label", path: "home.sailSection.features.1.label" },
  { field: "homeSailFeature1Desc", path: "home.sailSection.features.1.desc" },
  { field: "homeSailFindBoat", path: "home.sailSection.findBoat" },
  { field: "homeCtaTitle", path: "home.cta.title" },
  { field: "homeCtaSubtitle", path: "home.cta.subtitle" },
  { field: "homeCtaCreateExperience", path: "home.cta.createExperience" },
  { field: "homeCtaTransport", path: "home.cta.transport" },
  { field: "homeCtaStat0Value", path: "home.cta.stats.0.value" },
  { field: "homeCtaStat0Sub", path: "home.cta.stats.0.sub" },
  { field: "homeCtaStat1Value", path: "home.cta.stats.1.value" },
  { field: "homeCtaStat1Sub", path: "home.cta.stats.1.sub" },
  { field: "homeCtaStat2Value", path: "home.cta.stats.2.value" },
  { field: "homeCtaStat2Sub", path: "home.cta.stats.2.sub" },
  { field: "homeCtaStat3Value", path: "home.cta.stats.3.value" },
  { field: "homeCtaStat3Sub", path: "home.cta.stats.3.sub" },
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
