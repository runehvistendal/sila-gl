import { createClient as createBareSanityClient } from "@sanity/client"
import { createClient } from "@sanity/client/stega"
import { draftMode } from "next/headers"
import imageUrlBuilder from "@sanity/image-url"

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production"
const apiVersion = "2026-05-05"

const readToken =
  process.env.SANITY_API_READ_TOKEN ?? process.env.SANITY_API_TOKEN ?? undefined

const studioBase =
  process.env.NEXT_PUBLIC_SITE_URL != null && process.env.NEXT_PUBLIC_SITE_URL.length > 0
    ? `${process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")}/studio`
    : "http://localhost:3000/studio"

/**
 * Til validatePreviewUrl i draft-mode enable — uden Stega (ingen encoding i API-kald).
 */
export function getSanityBareTokenClient() {
  return createBareSanityClient({
    projectId,
    dataset,
    apiVersion,
    useCdn: false,
    token: readToken,
  })
}

/** CDN, publiceret perspektiv, Stega af (produktion). */
export function getSanityPublicClient() {
  return createClient({
    projectId,
    dataset,
    apiVersion,
    useCdn: true,
    stega: { enabled: false },
  })
}

/** Draft + Stega til click-to-edit (kræver aktiv draft mode + token). */
export function getSanityDraftStegaClient() {
  return createClient({
    projectId,
    dataset,
    apiVersion,
    useCdn: false,
    perspective: "previewDrafts",
    token: readToken,
    stega: {
      enabled: true,
      studioUrl: studioBase,
    },
  })
}

let _publicForImages: ReturnType<typeof getSanityPublicClient>
function getPublicSingleton() {
  if (!_publicForImages) _publicForImages = getSanityPublicClient()
  return _publicForImages
}

const builder = imageUrlBuilder(getPublicSingleton())

export async function sanityFetchClient() {
  const dm = await draftMode()
  if (dm.isEnabled && readToken) {
    return getSanityDraftStegaClient()
  }
  return getPublicSingleton()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sanityImage(source: any) {
  return builder.image(source)
}
