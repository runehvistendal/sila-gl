import { defineType, defineField } from "sanity"
import { globalHomeCopyFields } from "./partials/globalHomeCopyFields"

/** Standard _da/_en-par + valgfrit billede / link til hero. stringOverrides styr øvrige nøgler (fx fra bundled messages/*). */

export default defineType({
  name: "globalSettings",
  title: "Globale indstillinger",
  type: "document",
  fields: [
    defineField({ name: "footerBrand_da", title: "Footer — sitenavn / logo-tekst (DA)", type: "string" }),
    defineField({ name: "footerBrand_en", title: "Footer — sitenavn / logo-tekst (EN)", type: "string" }),

    defineField({ name: "footerTagline_da", title: "Footer-tagline (dansk)", type: "string" }),
    defineField({ name: "footerTagline_en", title: "Footer-tagline (engelsk)", type: "string" }),
    defineField({ name: "footerTagline_kl", title: "Footer-tagline (grønlandsk)", type: "string" }),

    defineField({ name: "footerCopyright_da", title: "Footer copyright (DA)", type: "string" }),
    defineField({ name: "footerCopyright_en", title: "Footer copyright (EN)", type: "string" }),
    defineField({ name: "footerSlogan_da", title: "Footer slogan (DA)", type: "string" }),
    defineField({ name: "footerSlogan_en", title: "Footer slogan (EN)", type: "string" }),
    defineField({
      name: "footerLinksTitle_da",
      title: 'Footer kolonne-links overskrift (DA) → "Platformer"',
      type: "string",
    }),
    defineField({
      name: "footerLinksTitle_en",
      title: "Footer kolonne-links overskrift (EN)",
      type: "string",
    }),

    defineField({ name: "contactEmail", title: "Kontakt-e-mail", type: "string" }),
    defineField({ name: "cvr", title: "CVR-nummer", type: "string" }),

    defineField({ name: "navHytter_da", title: "Nav — Hytter (DA)", type: "string" }),
    defineField({ name: "navHytter_en", title: "Nav — Hytter (EN)", type: "string" }),
    defineField({ name: "navTransport_da", title: "Nav — Transport (DA)", type: "string" }),
    defineField({ name: "navTransport_en", title: "Nav — Transport (EN)", type: "string" }),

    defineField({ name: "btnSearch_da", title: "Knap — Søg (DA)", type: "string" }),
    defineField({ name: "btnSearch_en", title: "Knap — Søg (EN)", type: "string" }),
    defineField({ name: "btnBook_da", title: "Knap — Book (DA)", type: "string" }),
    defineField({ name: "btnBook_en", title: "Knap — Book (EN)", type: "string" }),
    defineField({ name: "btnCreate_da", title: "Knap — Opret opslag (DA)", type: "string" }),
    defineField({ name: "btnCreate_en", title: "Knap — Opret opslag (EN)", type: "string" }),
    defineField({ name: "btnReadMore_da", title: "Knap — Læs mere (DA)", type: "string" }),
    defineField({ name: "btnReadMore_en", title: "Knap — Læs mere (EN)", type: "string" }),
    defineField({ name: "btnBack_da", title: "Knap — Tilbage (DA)", type: "string" }),
    defineField({ name: "btnBack_en", title: "Knap — Tilbage (EN)", type: "string" }),
    defineField({ name: "btnSave_da", title: "Knap — Gem (DA)", type: "string" }),
    defineField({ name: "btnSave_en", title: "Knap — Gem (EN)", type: "string" }),
    defineField({ name: "btnCancel_da", title: "Knap — Annuller (DA)", type: "string" }),
    defineField({ name: "btnCancel_en", title: "Knap — Annuller (EN)", type: "string" }),
    defineField({ name: "btnConfirm_da", title: "Knap — Bekræft (DA)", type: "string" }),
    defineField({ name: "btnConfirm_en", title: "Knap — Bekræft (EN)", type: "string" }),
    defineField({ name: "btnContact_da", title: "Knap — Kontakt (DA)", type: "string" }),
    defineField({ name: "btnContact_en", title: "Knap — Kontakt (EN)", type: "string" }),

    defineField({ name: "heroHeading_da", title: "Forside — overskrift (DA)", type: "string" }),
    defineField({ name: "heroHeading_en", title: "Forside — overskrift (EN)", type: "string" }),
    defineField({ name: "heroSubheading_da", title: "Forside — underoverskrift (DA)", type: "string" }),
    defineField({ name: "heroSubheading_en", title: "Forside — underoverskrift (EN)", type: "string" }),
    defineField({ name: "heroBadge_da", title: "Forside — badge (DA)", type: "string" }),
    defineField({ name: "heroBadge_en", title: "Forside — badge (EN)", type: "string" }),
    defineField({ name: "heroSearchPlaceholder_da", title: "Forside — søgefelt placeholder (DA)", type: "string" }),
    defineField({ name: "heroSearchPlaceholder_en", title: "Forside — søgefelt placeholder (EN)", type: "string" }),
    defineField({ name: "heroCtaLabel_da", title: "Forside — søg-knap (DA)", type: "string" }),
    defineField({ name: "heroCtaLabel_en", title: "Forside — søg-knap (EN)", type: "string" }),
    defineField({ name: "heroCtaHref", title: "Forside — primær CTA-link (valgfrit)", type: "string" }),
    defineField({
      name: "heroImage",
      title: "Forside — hero-baggrund (valgfrit)",
      type: "image",
      options: { hotspot: true },
    }),

    ...globalHomeCopyFields,

    defineField({
      name: "stringOverrides",
      title: "Øvrige UI-tekster (nøgle = sti i beskeder, fx home.howItWorks.title)",
      type: "array",
      of: [
        {
          type: "object",
          name: "stringOverride",
          fields: [
            defineField({
              name: "keyPath",
              title: "Sti",
              type: "string",
              validation: (Rule) => Rule.required(),
            }),
            defineField({ name: "da", title: "Dansk", type: "string" }),
            defineField({ name: "en", title: "Engelsk", type: "string" }),
          ],
          preview: {
            select: { title: "keyPath", da: "da" },
            prepare: ({ title, da }) => ({ title: title ?? "?", subtitle: da }),
          },
        },
      ],
    }),
  ],
})
