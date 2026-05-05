import { createClient } from "next-sanity"
import { draftMode } from "next/headers"
import imageUrlBuilder from "@sanity/image-url"

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET!
const apiVersion = "2026-05-05"

const readToken =
  process.env.SANITY_API_READ_TOKEN ?? process.env.SANITY_API_TOKEN ?? undefined

/** Public, CDN (published). */
export const sanityClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true,
})

/** Token client for draft-mode enable (validatePreviewUrl) — same project. */
export function getSanityDraftClient() {
  return createClient({
    projectId,
    dataset,
    apiVersion,
    useCdn: false,
    token: readToken,
  })
}

const builder = imageUrlBuilder(sanityClient)

/** Server fetches: preview perspective + no CDN when draft cookies are set. */
export async function sanityFetchClient() {
  const dm = await draftMode()
  if (dm.isEnabled && readToken) {
    return createClient({
      projectId,
      dataset,
      apiVersion,
      useCdn: false,
      token: readToken,
      perspective: "previewDrafts",
    })
  }
  return sanityClient
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sanityImage(source: any) {
  return builder.image(source)
}
