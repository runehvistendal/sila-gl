import { defineType, defineField } from "sanity"

export default defineType({
  name: "ctaSection",
  title: "CTA",
  type: "object",
  fields: [
    defineField({ name: "heading_da", type: "string", title: "Overskrift (DA)" }),
    defineField({ name: "heading_en", type: "string", title: "Heading (EN)" }),
    defineField({ name: "body_da", type: "text", title: "Tekst (DA)" }),
    defineField({ name: "body_en", type: "text", title: "Text (EN)" }),
    defineField({ name: "ctaLabel_da", type: "string", title: "Knaptext (DA)" }),
    defineField({ name: "ctaLabel_en", type: "string", title: "Button text (EN)" }),
    defineField({ name: "ctaHref", type: "string", title: "Knaplink" }),
  ],
  preview: {
    select: { title: "heading_da" },
    prepare: ({ title }) => ({ title: `CTA: ${title ?? "–"}` }),
  },
})
