import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { buildMetadata } from "@/lib/metadata"
import { createClient } from "@/lib/supabase-server"
import { getNavUserForPage } from "@/lib/getNavUser"
import Navbar from "@/components/layout/Navbar"
import AnmodClient from "./AnmodClient"

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "request" })
  return buildMetadata({
    locale,
    title: t("title"),
    description: t("subtitle"),
    path: "/anmod",
  })
}

export default async function AnmodPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const navUser = user ? await getNavUserForPage(supabase, user) : null

  return (
    <>
      <Navbar user={navUser} />
      <AnmodClient />
    </>
  )
}
