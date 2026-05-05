import { defineEnableDraftMode } from "next-sanity/draft-mode"
import { getSanityDraftClient } from "@/lib/sanity"

export const { GET } = defineEnableDraftMode({
  client: getSanityDraftClient(),
})
