import { getRequestConfig } from "next-intl/server"
import { cache } from "react"
import { hasLocale } from "next-intl"
import { routing } from "./routing"
import bundledDa from "@/i18n/bundled/da.json"
import bundledEn from "@/i18n/bundled/en.json"
import type { MessagesTree } from "@/lib/i18n/mergeSanityIntoMessages"
import { mergeSanityIntoMessages } from "@/lib/i18n/mergeSanityIntoMessages"
import { getGlobalSettings } from "@/lib/sanity.queries"

const mergeMessagesForLocale = cache(async (locale: string) => {
  const settings = await getGlobalSettings()
  const base = (locale === "en" ? bundledEn : bundledDa) as MessagesTree
  return mergeSanityIntoMessages(base, settings, locale)
})

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale

  const messages = await mergeMessagesForLocale(locale)

  return {
    locale,
    messages,
  }
})
