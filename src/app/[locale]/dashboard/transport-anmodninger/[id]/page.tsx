import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { createClient } from "@/lib/supabase-server"
import { getNavUserForPage } from "@/lib/getNavUser"
import Navbar from "@/components/layout/Navbar"
import { buildMetadata } from "@/lib/metadata"
import { ArrowLeft } from "lucide-react"
import { Link } from "@/i18n/navigation"
import {
  TransportAnmodningClient,
  type TransportAnmodningOfferVM,
  type TransportAnmodningRequestVM,
} from "./TransportAnmodningClient"

type PageProps = { params: Promise<{ locale: string; id: string }> }

function unwrapNested<T>(x: T | T[] | null | undefined): T | null {
  if (x == null) return null
  return Array.isArray(x) ? (x[0] ?? null) : x
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, id } = await params
  const t = await getTranslations({ locale, namespace: "dashboard" })
  return buildMetadata({
    locale,
    title: t("cabin_transport_detail_title"),
    description: t("cabin_transport_detail_subtitle"),
    path: `/dashboard/transport-anmodninger/${id}`,
  })
}

export const dynamic = "force-dynamic"

export default async function CabinTransportAnmodningDetailPage({ params }: PageProps) {
  const { locale, id } = await params
  setRequestLocale(locale)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(
      `/${locale}/login?next=${encodeURIComponent(`/${locale}/dashboard/transport-anmodninger/${id}`)}`,
    )
  }

  const navUser = await getNavUserForPage(supabase, user)
  const t = await getTranslations({ locale, namespace: "dashboard" })

  const { data: rawReq, error: reqErr } = await supabase
    .from("cabin_transport_requests")
    .select(
      `
      id,
      guest_id,
      cabin_id,
      arrival_point,
      arrival_date,
      num_persons,
      message,
      status,
      expires_at,
      cabins ( title )
    `,
    )
    .eq("id", id)
    .maybeSingle()

  if (reqErr || !rawReq) {
    notFound()
  }

  if (rawReq.guest_id !== user.id) {
    redirect(`/${locale}/dashboard`)
  }

  const cabin = unwrapNested(
    rawReq.cabins as { title: string } | { title: string }[] | null | undefined,
  )
  const cabinTitle = cabin?.title ?? "Hytte"

  const requestVm: TransportAnmodningRequestVM = {
    id: rawReq.id,
    arrival_point: String(rawReq.arrival_point ?? ""),
    arrival_date: String(rawReq.arrival_date ?? ""),
    num_persons: Number(rawReq.num_persons) || 0,
    message: (rawReq.message as string | null) ?? null,
    status: String(rawReq.status ?? "open"),
    expires_at: String(rawReq.expires_at ?? ""),
    cabin_title: cabinTitle,
  }

  const { data: offerRows, error: offErr } = await supabase
    .from("cabin_transport_offers")
    .select(
      `
      id,
      price_ore,
      message,
      status,
      created_at,
      profiles!provider_id ( full_name )
    `,
    )
    .eq("request_id", id)
    .order("created_at", { ascending: false })

  if (offErr) {
    console.error("[CabinTransportAnmodningDetailPage] offers", offErr.message)
    notFound()
  }

  const offers: TransportAnmodningOfferVM[] = (offerRows ?? []).map(
    (raw: Record<string, unknown>) => {
      const profilesRaw = raw.profiles
      const p = unwrapNested(
        profilesRaw as { full_name: string | null } | null | undefined,
      )
      return {
        id: raw.id as string,
        price_ore: Number(raw.price_ore) || 0,
        message: (raw.message as string | null) ?? null,
        status: String(raw.status ?? "pending"),
        created_at: String(raw.created_at ?? ""),
        provider_full_name: p?.full_name ?? null,
      }
    },
  )

  return (
    <>
      <Navbar user={navUser} />
      <main className="min-h-screen bg-gray-50 pb-16 pt-24">
        <div className="max-w-lg mx-auto px-4 sm:px-6">
          <Link
            href="/dashboard?tab=requests"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#114788] focus-visible:ring-offset-2 rounded-md"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("cabin_transport_detail_back")}
          </Link>
          <p className="text-sm text-muted-foreground mb-1">{t("cabin_transport_detail_subtitle")}</p>
          <h1 className="text-2xl font-bold text-foreground mb-8">
            {t("cabin_transport_detail_title")}
          </h1>
          <TransportAnmodningClient request={requestVm} offers={offers} />
        </div>
      </main>
    </>
  )
}
