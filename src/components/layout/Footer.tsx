import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { getGlobalSettings } from "@/lib/sanity.queries"

interface FooterProps {
  locale: string
}

export default async function Footer({ locale }: FooterProps) {
  const [t, settings] = await Promise.all([
    getTranslations({ locale, namespace: "footer" }),
    getGlobalSettings().catch(() => null),
  ])

  const tagline =
    settings?.[`footerTagline_${locale}`] ??
    settings?.footerTagline_da ??
    t("tagline")

  return (
    <footer className="bg-foreground border-t border-foreground/10 pt-12 pb-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          <div>
            <span className="text-base font-semibold block mb-3 text-primary-foreground">
              {t("brandName")}
            </span>
            <p className="text-xs leading-relaxed text-primary-foreground/50">
              {tagline}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-4 text-primary-foreground">{t("platforms")}</p>
            <div className="flex flex-col gap-2.5 text-sm text-primary-foreground/60">
              <Link href="/ophold/i-naturen" className="hover:text-primary-foreground transition-colors">{t("stay_nature")}</Link>
              <Link href="/ophold/i-byen" className="hover:text-primary-foreground transition-colors">{t("stay_city")}</Link>
              <Link href="/transport" className="hover:text-primary-foreground transition-colors">{t("platformTransport")}</Link>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-4 text-primary-foreground">{t("about")}</p>
            <div className="flex flex-col gap-2.5 text-sm text-primary-foreground/60">
              <Link href="/om"           className="hover:text-primary-foreground transition-colors">{t("aboutUs")}</Link>
              <Link href="/udbyderguide" className="hover:text-primary-foreground transition-colors">{t("providerGuide")}</Link>
              <Link href="/faq"          className="hover:text-primary-foreground transition-colors">{t("faq")}</Link>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-4 text-primary-foreground">{t("legal")}</p>
            <div className="flex flex-col gap-2.5 text-sm text-primary-foreground/60">
              <Link href="/privatlivspolitik" className="hover:text-primary-foreground transition-colors">{t("privacy")}</Link>
              <Link href="/vilkaar"           className="hover:text-primary-foreground transition-colors">{t("terms")}</Link>
              <Link href="/blog"              className="hover:text-primary-foreground transition-colors">{t("blog")}</Link>
            </div>
          </div>
        </div>
        <div className="border-t border-primary-foreground/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-primary-foreground/60">
            {t("copyright")}
          </p>
          <p className="text-xs text-primary-foreground/60">
            {t("slogan")}
          </p>
        </div>
      </div>
    </footer>
  )
}
