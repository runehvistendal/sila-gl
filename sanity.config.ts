import { defineConfig } from "sanity"
import { structureTool } from "sanity/structure"
import { visionTool } from "@sanity/vision"
import { presentationTool, defineDocuments, defineLocations } from "sanity/presentation"
import { schemaTypes } from "./sanity/schemas"

const previewInitial =
  process.env.SANITY_STUDIO_PREVIEW_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"

export default defineConfig({
  name: "sila-gl",
  title: "Sila.gl",
  projectId: "lu0y9jmk",
  dataset: "production",
  plugins: [
    structureTool(),
    presentationTool({
      previewUrl: {
        initial: previewInitial,
        previewMode: {
          enable: "/api/draft-mode/enable",
          disable: "/api/draft-mode/disable",
        },
      },
      allowOrigins: ["http://localhost:*", previewInitial],
      resolve: {
        mainDocuments: defineDocuments([
          {
            route: "/:locale/blog/:slug",
            filter: `_type == "post" && slug.current == $slug`,
          },
          {
            route: "/:locale/destination/:slug",
            filter: `_type == "destination" && slug.current == $slug`,
          },
          {
            route: "/:locale",
            filter: `_type == "globalSettings"`,
          },
          {
            route: "/:locale",
            filter: `_type == "homePage"`,
          },
          {
            route: "/:locale/:slug",
            filter: `_type == "page" && slug.current == $slug`,
          },
        ]),
        locations: {
          globalSettings: defineLocations({
            select: { _id: "_id" },
            resolve: () => ({
              locations: [
                { title: "Forside (DA)", href: "/da" },
                { title: "Homepage (EN)", href: "/en" },
              ],
            }),
          }),
          homePage: defineLocations({
            select: { _id: "_id" },
            resolve: () => ({
              locations: [
                { title: "DA", href: "/da" },
                { title: "EN", href: "/en" },
              ],
            }),
          }),
          page: defineLocations({
            select: { slug: "slug.current" },
            resolve: (doc) => ({
              locations: [
                { title: "DA", href: doc?.slug ? `/da/${doc.slug}` : "/da" },
                { title: "EN", href: doc?.slug ? `/en/${doc.slug}` : "/en" },
              ],
            }),
          }),
          destination: defineLocations({
            select: { slug: "slug.current" },
            resolve: (doc) => ({
              locations: [
                { title: "DA", href: doc?.slug ? `/da/destination/${doc.slug}` : "/da/destination" },
                { title: "EN", href: doc?.slug ? `/en/destination/${doc.slug}` : "/en/destination" },
              ],
            }),
          }),
          post: defineLocations({
            select: { slug: "slug.current" },
            resolve: (doc) => ({
              locations: [
                { title: "DA", href: doc?.slug ? `/da/blog/${doc.slug}` : "/da/blog" },
                { title: "EN", href: doc?.slug ? `/en/blog/${doc.slug}` : "/en/blog" },
              ],
            }),
          }),
        },
      },
    }),
    visionTool(),
  ],
  schema: { types: schemaTypes },
})
