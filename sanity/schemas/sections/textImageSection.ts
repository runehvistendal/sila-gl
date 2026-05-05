import { defineType, defineField } from "sanity"

export default defineType({
  name: "textImageSection",
  title: "Tekst + billede",
  type: "object",
  fields: [
    defineField({ name: "heading_da", type: "string", title: "Overskrift (DA)" }),
    defineField({ name: "heading_en", type: "string", title: "Heading (EN)" }),
    defineField({ name: "body_da", type: "array", title: "Tekst (DA)", of: [{ type: "block" }] }),
    defineField({ name: "body_en", type: "array", title: "Text (EN)", of: [{ type: "block" }] }),
    defineField({ name: "image", type: "image", title: "Billede", options: { hotspot: true } }),
    defineField({
      name: "imagePosition",
      type: "string",
      title: "Billedposition",
      options: { list: ["right", "left"], layout: "radio" },
      initialValue: "right",
    }),
  ],
  preview: {
    select: { title: "heading_da" },
    prepare: ({ title }) => ({ title: `Tekst+billede: ${title ?? "–"}` }),
  },
})
