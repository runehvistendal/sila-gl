import { sanityFetchClient } from "./sanity"

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

export async function getHomePage() {
  return safeFetch(`*[_type == "homePage"][0]`)
}

export async function getDestination(slug: string) {
  return safeFetch(`*[_type == "destination" && slug.current == $slug][0]`, { slug })
}

export async function getAllDestinations() {
  return safeFetch(`*[_type == "destination"]{ slug, name }`)
}

export async function getPage(slug: string) {
  return safeFetch(`*[_type == "page" && slug.current == $slug][0]`, { slug })
}

const pageBySlugProjection = `
  _id,
  title_da, title_en,
  seoTitle_da, seoTitle_en,
  seoDescription_da, seoDescription_en,
  sections[]{
    ...,
    image,
    items[]{
      ...,
    },
    images[],
    body_da,
    body_en
  }
`

export async function getPageBySlug(slug: string) {
  return safeFetch(
    `*[_type == "page" && slug.current == $slug][0]{ ${pageBySlugProjection} }`,
    { slug }
  )
}

export async function getAllPosts() {
  return safeFetch(
    `*[_type == "post"] | order(publishedAt desc){ title_da, title_en, slug, publishedAt, excerpt_da, excerpt_en, coverImage }`
  )
}

export async function getPost(slug: string) {
  return safeFetch(`*[_type == "post" && slug.current == $slug][0]`, { slug })
}

export async function getGlobalSettings() {
  return safeFetch(`*[_type == "globalSettings"][0]`)
}
