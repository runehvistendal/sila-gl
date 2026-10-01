"use client"

import { Grid, Sparkles } from "lucide-react"
import { useLocale } from "next-intl"
import { Link } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import ExperienceCard, { type ExperienceListingItem } from "./components/ExperienceCard"

interface Props {
  experiences: ExperienceListingItem[]
}

const COPY = {
  da: {
    pageTitle: "Oplevelser",
    subtitle: "Find lokale oplevelser med grønlandske guides",
    filterPlaceholder: "Filtrering kommer snart",
    emptyTitle: "Ingen oplevelser endnu",
    emptySubtitle: "Vi arbejder på at få de første udbydere med",
    countOne: "1 oplevelse fundet",
    countMany: (n: number) => `${n} oplevelser fundet`,
    ctaTitle: "Tilbyd din egen oplevelse",
    ctaButton: "Opret oplevelse →",
    gridAria: "Listevisning",
  },
  en: {
    pageTitle: "Experiences",
    subtitle: "Find local experiences with Greenlandic guides",
    filterPlaceholder: "Filters coming soon",
    emptyTitle: "No experiences yet",
    emptySubtitle: "We are working with the first hosts to go live.",
    countOne: "1 experience found",
    countMany: (n: number) => `${n} experiences found`,
    ctaTitle: "Offer your own experience",
    ctaButton: "Create experience →",
    gridAria: "Grid view",
  },
}
export default function ExperiencesClient({ experiences }: Props) {
  const locale = useLocale()
  const t = locale === "en" ? COPY.en : COPY.da
  const countLabel =
    experiences.length === 1 ? t.countOne : t.countMany(experiences.length)

  return (
    <div className="min-h-screen bg-background pt-16">
      <div className="border-b border-border bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="mb-1 text-3xl font-bold text-foreground">{t.pageTitle}</h1>
              <p className="text-muted-foreground">{t.subtitle}</p>
            </div>
            <div className="flex gap-1 rounded-xl bg-muted p-1">
              <button
                type="button"
                className="flex rounded-lg bg-white p-2 text-foreground shadow-sm"
                aria-label={t.gridAria}
                aria-current="true"
              >
                <Grid className="size-4" aria-hidden />
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-4 text-center text-sm text-muted-foreground">
            {t.filterPlaceholder}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {experiences.length > 0 ? (
          <>
            <p className="mb-6 text-sm text-muted-foreground">{countLabel}</p>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {experiences.map((exp) => (
                <ExperienceCard key={exp.id} {...exp} />
              ))}
            </div>
          </>
        ) : (
          <div className="py-24 text-center">
            <Sparkles className="mx-auto mb-4 size-12 text-muted-foreground/35" aria-hidden />
            <p className="mb-1 text-lg font-medium text-foreground">{t.emptyTitle}</p>
            <p className="text-sm text-muted-foreground">{t.emptySubtitle}</p>
          </div>
        )}
      </div>

      <section className="border-t border-border bg-primary/5 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div>
              <h2 className="mb-2 text-2xl font-bold text-foreground sm:text-3xl">{t.ctaTitle}</h2>
            </div>
            <Button
              asChild
              size="lg"
              className="w-full whitespace-nowrap rounded-xl px-6 font-semibold text-white hover:opacity-[0.96] sm:w-auto"
              style={{ backgroundColor: "#114788" }}
            >
              <Link href="/opret/oplevelse">{t.ctaButton}</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
