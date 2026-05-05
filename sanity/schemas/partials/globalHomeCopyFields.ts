import { defineField } from "sanity"

/** _da/_en-par til forside-copy + navbar (bundlet fallback i repo; Sanity overstyrer + Visual Editing-stega). */

function localePair(base: string, studioTitle: string): ReturnType<typeof defineField>[] {
  return [
    defineField({ name: `${base}_da`, title: `${studioTitle} (DA)`, type: "string" }),
    defineField({ name: `${base}_en`, title: `${studioTitle} (EN)`, type: "string" }),
  ]
}

export const globalHomeCopyFields = [
  ...localePair("heroImageAlt", "Forside — hero-billede alt-tekst"),

  ...localePair("homeHowItWorksTitle", 'Forside — "Sådan virker det" overskrift'),
  ...localePair("homeHowItWorksSubtitle", "Forside — 'Sådan virker det' undertitel"),
  ...localePair("homeHowItWorksStepLabel", "Forside — trin-label (fx Step)"),

  ...localePair("homeHowItWorksStep0Title", "Forside — trin 1 titel"),
  ...localePair("homeHowItWorksStep0Desc", "Forside — trin 1 tekst"),
  ...localePair("homeHowItWorksStep1Title", "Forside — trin 2 titel"),
  ...localePair("homeHowItWorksStep1Desc", "Forside — trin 2 tekst"),
  ...localePair("homeHowItWorksStep2Title", "Forside — trin 3 titel"),
  ...localePair("homeHowItWorksStep2Desc", "Forside — trin 3 tekst"),

  ...localePair("homeCabinsTitle", "Forside — hytte-afsnit overskrift"),
  ...localePair("homeCabinsSubtitle", "Forside — hytte-afsnit undertitel"),
  ...localePair("homeCabinsSeeAll", 'Forside — "Se alle"-link'),
  ...localePair("homeCabinsSeeAllCabins", 'Forside — "Se alle hytter" (mobil)'),
  ...localePair("homeCabinsPerNight", "Forside — prissuffiks ved hytte-demo (/ nat)"),

  ...localePair("homeSailUniqueLabel", "Forside — sejlafsnit mærkat"),
  ...localePair("homeSailTitle", "Forside — sejlafsnit titel"),
  ...localePair("homeSailTitleHighlight", "Forside — sejlafsnit titel-highlight (kursiv)"),
  ...localePair("homeSailDesc", "Forside — sejlafsnit brødtekst"),
  ...localePair("homeSailFeature0Label", "Forside — sejl feature 1 titel"),
  ...localePair("homeSailFeature0Desc", "Forside — sejl feature 1 tekst"),
  ...localePair("homeSailFeature1Label", "Forside — sejl feature 2 titel"),
  ...localePair("homeSailFeature1Desc", "Forside — sejl feature 2 tekst"),
  ...localePair("homeSailFindBoat", 'Forside — "Find en bådtur"-knap'),

  ...localePair("homeCtaTitle", "Forside — CTA-blok overskrift"),
  ...localePair("homeCtaSubtitle", "Forside — CTA undertitel"),
  ...localePair("homeCtaCreateExperience", "Forside — CTA-knap opret oplevelse"),
  ...localePair("homeCtaTransport", "Forside — CTA-knap transport"),

  ...localePair("homeCtaStat0Value", "Forside — stat 1 hovedtekst"),
  ...localePair("homeCtaStat0Sub", "Forside — stat 1 undertitel"),
  ...localePair("homeCtaStat1Value", "Forside — stat 2 hovedtekst"),
  ...localePair("homeCtaStat1Sub", "Forside — stat 2 undertitel"),
  ...localePair("homeCtaStat2Value", "Forside — stat 3 hovedtekst"),
  ...localePair("homeCtaStat2Sub", "Forside — stat 3 undertitel"),
  ...localePair("homeCtaStat3Value", "Forside — stat 4 hovedtekst"),
  ...localePair("homeCtaStat3Sub", "Forside — stat 4 undertitel"),

  ...localePair("navLogoText", "Nav — logo ved siden af anker"),
  ...localePair("navAriaOpenMenu", "Nav — åbn mobilmenu (aria-label)"),
  ...localePair("navAriaCloseMenu", "Nav — luk mobilmenu (aria-label)"),
  ...localePair("navLocaleRowDa", 'Nav — sprogvalg: dansk linje (fx med 🇩🇰)'),
  ...localePair("navLocaleRowEn", 'Nav — sprogvalg: engelsk linje'),
  ...localePair("navProfileAvatarAlt", "Nav — profilikon alt-tekst ved tom bruger"),
]
