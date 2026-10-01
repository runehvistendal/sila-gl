#!/usr/bin/env node
/**
 * Statisk tjek af next-intl-nøgler.
 *
 *   npm run check:i18n
 *
 * Finder t("nøgle")-kald, hvor nøglen ikke findes i src/i18n/bundled/{da,en}.json,
 * og nøgler der kun findes på det ene sprog. Dynamiske nøgler (t(`x_${y}`)) springes over.
 * En manglende nøgle vises i UI som "namespace.nøgle" — derfor fejler scriptet (exit 1).
 */
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

const ROOT = new URL("..", import.meta.url).pathname
const load = (l) => JSON.parse(readFileSync(join(ROOT, `src/i18n/bundled/${l}.json`), "utf8"))
const bundles = { da: load("da"), en: load("en") }

const get = (obj, path) => path.split(".").reduce((o, k) => (o && typeof o === "object" ? o[k] : undefined), obj)

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) yield* walk(p)
    else if (/\.(tsx?|mjs)$/.test(name)) yield p
  }
}

const BIND =
  /(?:const|let)\s+(\w+)\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations)\(\s*(?:"([^"]*)"|\{[^}]*namespace:\s*"([^"]+)"[^}]*\}|)\s*\)/g

const problems = []
for (const file of walk(join(ROOT, "src"))) {
  const src = readFileSync(file, "utf8")
  const binds = new Map()
  for (const m of src.matchAll(BIND)) {
    // Samme variabelnavn kan bindes til flere namespaces i én fil (forskellige funktioner)
    const ns = m[2] ?? m[3] ?? ""
    if (!binds.has(m[1])) binds.set(m[1], new Set())
    binds.get(m[1]).add(ns)
  }
  for (const [name, spaces] of binds) {
    const call = new RegExp(`(?<![\\w.])${name}(?:\\.rich|\\.markup|\\.has)?\\(\\s*"([^"]+)"`, "g")
    for (const m of src.matchAll(call)) {
      const key = m[1]
      for (const lang of ["da", "en"]) {
        const found = [...spaces].some((ns) => get(bundles[lang], ns ? `${ns}.${key}` : key) !== undefined)
        if (!found) {
          const line = src.slice(0, m.index).split("\n").length
          problems.push(`${file.replace(ROOT, "")}:${line}  [${lang}] ${[...spaces].join("|")}.${key}`)
        }
      }
    }
  }
}

// Nøgler der kun findes på ét sprog
const flat = (o, p = "") =>
  Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" ? flat(v, `${p}${k}.`) : [`${p}${k}`]))
const da = new Set(flat(bundles.da))
const en = new Set(flat(bundles.en))
for (const k of da) if (!en.has(k)) problems.push(`bundled/en.json mangler ${k}`)
for (const k of en) if (!da.has(k)) problems.push(`bundled/da.json mangler ${k}`)

if (problems.length) {
  console.error(`${problems.length} i18n-problemer:\n` + problems.join("\n"))
  process.exit(1)
}
console.log("i18n OK — alle statiske nøgler findes på dansk og engelsk")
