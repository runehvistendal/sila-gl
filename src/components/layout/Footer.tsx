"use client"

import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"

export default function Footer() {
  const t = useTranslations("footer")

  return (
    <footer className="bg-foreground border-t border-foreground/10 pt-12 pb-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          <div>
            <span className="text-base font-semibold block mb-3 text-primary-foreground">
              Sila.gl
            </span>
            <p className="text-xs leading-relaxed text-primary-foreground/50">
              {t("tagline")}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-4 text-primary">{t("platforms")}</p>
            <div className="flex flex-col gap-2.5 text-sm text-primary-foreground/60">
              <Link href="/hytter"    className="hover:text-primary-foreground transition-colors">{t("cabins")}</Link>
              <Link href="/transport" className="hover:text-primary-foreground transition-colors">{t("transport")}</Link>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-4 text-primary">{t("about")}</p>
            <div className="flex flex-col gap-2.5 text-sm text-primary-foreground/60">
              <Link href="/om-os"       className="hover:text-primary-foreground transition-colors">{t("aboutUs")}</Link>
              <Link href="/opret-konto" className="hover:text-primary-foreground transition-colors">{t("becomeProvider")}</Link>
              <Link href="/kontakt"     className="hover:text-primary-foreground transition-colors">{t("contact")}</Link>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-4 text-primary">{t("legal")}</p>
            <div className="flex flex-col gap-2.5 text-sm text-primary-foreground/60">
              <Link href="/privatlivspolitik" className="hover:text-primary-foreground transition-colors">{t("privacy")}</Link>
              <Link href="/vilkaar"           className="hover:text-primary-foreground transition-colors">{t("terms")}</Link>
              <Link href="/cookies"           className="hover:text-primary-foreground transition-colors">{t("cookies")}</Link>
            </div>
          </div>
        </div>
        <div className="border-t border-primary-foreground/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-primary-foreground/30">
            {t("copyright")}
          </p>
          <p className="text-xs text-primary-foreground/30">
            {t("slogan")}
          </p>
        </div>
      </div>
    </footer>
  )
}
