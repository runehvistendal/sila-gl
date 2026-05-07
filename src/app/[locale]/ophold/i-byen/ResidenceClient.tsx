"use client"

import type { ComponentProps } from "react"
import HytterClient from "@/app/[locale]/hytter/HytterClient"

type HytterProps = ComponentProps<typeof HytterClient>

/** Ophold i byen — filtre for boliger; detalje under /ophold/i-byen/[id] */
export default function ResidenceClient(
  props: Omit<
    HytterProps,
    "filterBasePath" | "listingKind" | "detailHrefForId" | "translationScope"
  >,
) {
  return (
    <HytterClient
      {...props}
      filterBasePath="/ophold/i-byen"
      listingKind="residence"
      detailHrefForId={(id) => `/ophold/i-byen/${id}`}
      translationScope="ophold.city"
    />
  )
}
