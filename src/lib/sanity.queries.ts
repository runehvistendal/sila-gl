import { sanityClient } from "./sanity"

export async function getHomePage() {
  return sanityClient.fetch(`*[_type == "homePage"][0]`)
}

export async function getDestination(slug: string) {
  return sanityClient.fetch(
    `*[_type == "destination" && slug.current == $slug][0]`,
    { slug }
  )
}

export async function getAllDestinations() {
  return sanityClient.fetch(`*[_type == "destination"]{ slug, name }`)
}

export async function getPage(slug: string) {
  return sanityClient.fetch(
    `*[_type == "page" && slug.current == $slug][0]`,
    { slug }
  )
}

export async function getAllPosts() {
  return sanityClient.fetch(
    `*[_type == "post"] | order(publishedAt desc){ title_da, title_en, slug, publishedAt, excerpt_da, excerpt_en, coverImage }`
  )
}

export async function getPost(slug: string) {
  return sanityClient.fetch(
    `*[_type == "post" && slug.current == $slug][0]`,
    { slug }
  )
}

export async function getGlobalSettings() {
  return sanityClient.fetch(`*[_type == "globalSettings"][0]`)
}
