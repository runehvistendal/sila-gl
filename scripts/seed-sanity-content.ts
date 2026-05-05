/**
 * Opretter/opdaterer ét globalSettings-dokument i Sanity med al DA/EN-tekst fra
 * src/i18n/bundled/da.json + en.json (navngivne felter + stringOverrides for resten).
 *
 * Kræver: SANITY_API_TOKEN (skriv), NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET
 * Kør fra repo-rod: npx tsx scripts/seed-sanity-content.ts
 */

import { createHash } from "node:crypto"
import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"
import { createClient } from "@sanity/client"
import type { MessagesTree } from "../src/lib/i18n/mergeSanityIntoMessages"
import { GLOBAL_SETTINGS_SEMANTIC_FIELDS } from "../src/lib/i18n/mergeSanityIntoMessages"

function loadEnvLocal(): void {
  const p = resolve(process.cwd(), ".env.local")
  if (!existsSync(p)) return
  const raw = readFileSync(p, "utf8")
  for (const line of raw.split("\n")) {
    const t = line.trim()
    if (!t || t.startsWith("#")) continue
    const eq = t.indexOf("=")
    if (eq <= 0) continue
    const key = t.slice(0, eq).trim()
    let val = t.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = val
  }
}

function flattenStringLeaves(obj: unknown, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {}
  if (obj === null || obj === undefined) return out
  if (typeof obj === "string") {
    if (prefix) out[prefix] = obj
    return out
  }
  if (typeof obj !== "object" || Array.isArray(obj)) return out
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const p = prefix ? `${prefix}.${k}` : k
    if (typeof v === "string") out[p] = v
    else if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(out, flattenStringLeaves(v, p))
    }
  }
  return out
}

const COVERED_BY_NAMED = new Set<string>([
  ...GLOBAL_SETTINGS_SEMANTIC_FIELDS.map((x) => x.path),
  "footer.tagline",
])

function overrideKey(dotPath: string): string {
  return createHash("sha1").update(dotPath).digest("hex").slice(0, 24)
}

async function main() {
  loadEnvLocal()

  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production"
  const token = process.env.SANITY_API_TOKEN ?? process.env.SANITY_API_READ_TOKEN ?? process.env.SANITY_WRITE_TOKEN

  if (!projectId) {
    console.error("Mangler NEXT_PUBLIC_SANITY_PROJECT_ID")
    process.exit(1)
  }
  if (!token) {
    console.error("Mangler SANITY_API_TOKEN (Editor) eller SANITY_WRITE_TOKEN i .env.local")
    process.exit(1)
  }

  const daPath = resolve(process.cwd(), "src/i18n/bundled/da.json")
  const enPath = resolve(process.cwd(), "src/i18n/bundled/en.json")
  const da = JSON.parse(readFileSync(daPath, "utf8")) as MessagesTree
  const en = JSON.parse(readFileSync(enPath, "utf8")) as MessagesTree

  const flatDa = flattenStringLeaves(da)
  const flatEn = flattenStringLeaves(en)

  const named: Record<string, string> = {}
  for (const { field, path } of GLOBAL_SETTINGS_SEMANTIC_FIELDS) {
    named[`${field}_da`] = flatDa[path] ?? ""
    named[`${field}_en`] = flatEn[path] ?? flatDa[path] ?? ""
  }

  named.footerTagline_da = flatDa["footer.tagline"] ?? ""
  named.footerTagline_en = flatEn["footer.tagline"] ?? flatDa["footer.tagline"] ?? ""

  const allPaths = new Set([...Object.keys(flatDa), ...Object.keys(flatEn)])
  const stringOverrides = [...allPaths]
    .filter((p) => !COVERED_BY_NAMED.has(p))
    .sort()
    .map((keyPath) => ({
      _type: "stringOverride" as const,
      _key: overrideKey(keyPath),
      keyPath,
      da: flatDa[keyPath] ?? "",
      en: flatEn[keyPath] ?? flatDa[keyPath] ?? "",
    }))

  const client = createClient({
    projectId,
    dataset,
    apiVersion: "2026-05-05",
    token,
    useCdn: false,
  })

  type GsDoc = {
    _id?: string
    heroImage?: unknown
    heroCtaHref?: string | null
    contactEmail?: string | null
    cvr?: string | null
    footerTagline_kl?: string | null
  }

  const existing = await client.fetch<GsDoc | null>(`*[_type == "globalSettings"][0]{ _id, heroImage, heroCtaHref, contactEmail, cvr, footerTagline_kl }`)

  const baseFields: Record<string, unknown> = {
    ...named,
    stringOverrides,
  }

  if (existing?.heroImage != null) baseFields.heroImage = existing.heroImage
  if (existing?.heroCtaHref != null && existing.heroCtaHref !== "") baseFields.heroCtaHref = existing.heroCtaHref
  if (existing?.contactEmail != null && existing.contactEmail !== "") baseFields.contactEmail = existing.contactEmail
  if (existing?.cvr != null && existing.cvr !== "") baseFields.cvr = existing.cvr
  if (existing?.footerTagline_kl != null && existing.footerTagline_kl !== "") {
    baseFields.footerTagline_kl = existing.footerTagline_kl
  }

  if (existing?._id) {
    await client.patch(existing._id).set(baseFields).commit()
    console.log(`OK opdateret globalSettings ${existing._id}`)
  } else {
    try {
      await client.create({
        _type: "globalSettings",
        ...baseFields,
      })
      console.log("OK oprettet nyt globalSettings-dokument")
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : String(e)
      if (msg.includes("permission") || msg.includes("403")) {
        console.error(
          "\nSANITY_API_TOKEN mangler Editor-rettigheder (create).\n\n" +
            "Sådan kan du klare seed:\n" +
            "1) Sanity → Manage project → API → Add API token → Editor (eller Administrator)\n" +
            "   og sæt SANITY_API_TOKEN i .env.local, eller\n" +
            "2) Opret manuelt ét dokument af typen «Globale indstillinger» i Studio\n" +
            "   og kør scriptet igen (kun patch kræves herefter).\n",
        )
        process.exit(2)
      }
      throw e
    }
  }

  console.log(`  Navngivne felter (SEMANTIC + footer.tagline linje): ${GLOBAL_SETTINGS_SEMANTIC_FIELDS.length + 1}`)
  console.log(`  stringOverrides: ${stringOverrides.length} rækker`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
