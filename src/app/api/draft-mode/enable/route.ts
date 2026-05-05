import { defineEnableDraftMode } from "next-sanity/draft-mode"
import { getSanityBareTokenClient } from "@/lib/sanity"

export const { GET } = defineEnableDraftMode({
  client: getSanityBareTokenClient(),
})
