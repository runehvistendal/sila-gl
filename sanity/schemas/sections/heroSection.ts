import { defineType, defineField } from "sanity"

export default defineType({
  name: "heroSection",
  title: "Hero",
  type: "object",
  fields: [
    defineField({ name: "heading_da", title: "Overskrift (DA)", type: "string" }),
    defineField({ name: "heading_en", title: "Heading (EN)", type: "string" }),
    defineField({ name: "subheading_da", title: "Underoverskrift (DA)", type: "string" }),
    defineField({ name: "subheading_en", title: "Subheading (EN)", type: "string" }),
    defineField({ name: "image", title: "Baggrundsbillede", type: "image", options: { hotspot: true } }),
    defineField({ name: "ctaLabel_da", title: "Knaptext (DA)", type: "string" }),
    defineField({ name: "ctaLabel_en", title: "Button text (EN)", type: "string" }),
    defineField({ name: "ctaHref", title: "Knaplink", type: "string" }),
  ],
  preview: {
    select: { title: "heading_da" },
    prepare: ({ title }) => ({ title: `Hero: ${title ?? "–"}` }),
  },
})
