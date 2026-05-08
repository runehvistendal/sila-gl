"use client"

import { Anchor, ChevronLeft } from "lucide-react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"

export default function TransportAnmodShell({
  children,
}: {
  children: React.ReactNode
}) {
  const t = useTranslations("request")
  const tCommon = useTranslations("common")

  return (
    <main
      className="min-h-screen bg-background pt-24"
      style={{ fontFamily: "var(--font-jakarta, system-ui)" }}
    >
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-10">
        <Link
          href="/dashboard?tab=requests"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ChevronLeft className="w-4 h-4" /> {tCommon("back")}
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Anchor className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{t("transport_title")}</h1>
            <p className="text-sm text-muted-foreground">{t("transport_subtitle")}</p>
          </div>
        </div>

        {children}
      </div>
    </main>
  )
}
