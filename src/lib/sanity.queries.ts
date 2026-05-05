import { sanityFetchClient } from "./sanity"

/** Del af GROQ for page builder-sektioner (felter matcher SectionRenderer). */
export const SANITY_SECTIONS_PROJECTION = `sections[]{
  ...,
  image,
  items[]{ ... },
  images[],
  body_da,
  body_en
}`

// Wrapper der returnerer null i stedet for at kaste ved netværksfejl,
// manglende dataset eller Sanity-nedetid — siden viser altid fallback-indhold.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function safeFetch(query: string, params?: Record<string, unknown>): Promise<any> {
  try {
    const client = await sanityFetchClient()
    return await client.fetch(query, params ?? {})
  } catch {
    return null
  }
}

/** @param _locale reserveret til fremtidigt locale-specifikt indhold */
export async function getHomePage(_locale?: string) {
  void _locale
  return safeFetch(
    `*[_type == "homePage"][0]{
      ...,
      ${SANITY_SECTIONS_PROJECTION}
    }`,
    {}
  )
}

export async function getDestination(slug: string) {
  return safeFetch(
    `*[_type == "destination" && slug.current == $slug][0]{
      ...,
      ${SANITY_SECTIONS_PROJECTION}
    }`,
    { slug }
  )
}

export async function getAllDestinations() {
  return safeFetch(`*[_type == "destination"]{ slug, name }`)
}

export async function getPage(slug: string) {
  return safeFetch(
    `*[_type == "page" && slug.current == $slug][0]{
      ...,
      ${SANITY_SECTIONS_PROJECTION}
    }`,
    { slug }
  )
}

/** @deprecated synonym for getPage — samme dokument og projection */
export async function getPageBySlug(slug: string) {
  return getPage(slug)
}

export async function getAllPosts() {
  return safeFetch(
    `*[_type == "post"] | order(publishedAt desc){ title_da, title_en, slug, publishedAt, excerpt_da, excerpt_en, coverImage }`
  )
}

export async function getPost(slug: string) {
  return safeFetch(
    `*[_type == "post" && slug.current == $slug][0]{
      ...,
      ${SANITY_SECTIONS_PROJECTION}
    }`,
    { slug }
  )
}

export async function getGlobalSettings() {
  return safeFetch(`*[_type == "globalSettings"][0]`)
}
