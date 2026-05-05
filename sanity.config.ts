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
            route: "/:locale/:slug",
            filter: `_type == "page" && slug.current == $slug`,
          },
        ]),
        locations: {
          page: defineLocations({
            select: { title: "title_da", slug: "slug.current" },
            resolve: (doc) => ({
              locations: [
                {
                  title: doc?.title ? `${doc.title} (DA)` : "Side (DA)",
                  href: doc?.slug ? `/da/${doc.slug}` : "/da",
                },
                {
                  title: doc?.title ? `${doc.title} (EN)` : "Side (EN)",
                  href: doc?.slug ? `/en/${doc.slug}` : "/en",
                },
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
