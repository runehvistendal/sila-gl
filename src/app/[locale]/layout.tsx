import type { Metadata } from "next"
import { NextIntlClientProvider, hasLocale } from "next-intl"
import { notFound } from "next/navigation"
import { setRequestLocale } from "next-intl/server"
import { Toaster } from "sonner"
import Footer from "@/components/layout/Footer"
import { routing } from "@/i18n/routing"

export const metadata: Metadata = {
  title: "Sila.gl — Grønland på lokale vilkår",
  description:
    "Grønlands første marketplace for hytteudlejning, samsejlads og oplevelser. Find din næste arktiske oplevelse.",
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

type Props = {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params

  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  setRequestLocale(locale)

  return (
    <NextIntlClientProvider>
      {children}
      <Footer locale={locale} />
      <Toaster position="top-center" richColors />
    </NextIntlClientProvider>
  )
}
