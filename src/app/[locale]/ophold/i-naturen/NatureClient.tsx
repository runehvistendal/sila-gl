"use client"

import type { ComponentProps } from "react"
import HytterClient from "@/app/[locale]/hytter/HytterClient"

type HytterProps = ComponentProps<typeof HytterClient>

/** Ophold i naturen — samme som HytterClient med fast base path og detalje-URL under /ophold/i-naturen/[id] */
export default function NatureClient(
  props: Omit<
    HytterProps,
    "filterBasePath" | "listingKind" | "detailHrefForId" | "translationScope"
  >,
) {
  return (
    <HytterClient
      {...props}
      filterBasePath="/ophold/i-naturen"
      listingKind="cabin"
      detailHrefForId={(id) => `/ophold/i-naturen/${id}`}
      translationScope="ophold.nature"
    />
  )
}
