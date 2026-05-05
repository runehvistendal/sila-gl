import { defineType, defineField } from "sanity"

export default defineType({
  name: "imageGallerySection",
  title: "Billedgalleri",
  type: "object",
  fields: [
    defineField({ name: "heading_da", type: "string", title: "Overskrift (DA)" }),
    defineField({ name: "heading_en", type: "string", title: "Heading (EN)" }),
    defineField({
      name: "images",
      type: "array",
      title: "Billeder",
      of: [{ type: "image", options: { hotspot: true } }],
    }),
  ],
  preview: {
    select: { title: "heading_da" },
    prepare: ({ title }) => ({ title: `Galleri: ${title ?? "–"}` }),
  },
})
