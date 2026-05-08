import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { createClient } from "@/lib/supabase-server"
import { getNavUserForPage } from "@/lib/getNavUser"
import { buildMetadata } from "@/lib/metadata"
import Navbar from "@/components/layout/Navbar"
import AnmodForm from "./AnmodForm"
import TransportAnmodShell from "./TransportAnmodShell"

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "request" })
  return buildMetadata({
    locale,
    title: t("transport_title"),
    description: t("transport_subtitle"),
    path: "/transport/anmod",
  })
}

export default async function AnmodPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login?next=/transport/anmod")

  const navUser = await getNavUserForPage(supabase, user)

  return (
    <>
      <Navbar user={navUser} />
      <TransportAnmodShell>
        <AnmodForm />
      </TransportAnmodShell>
    </>
  )
}
