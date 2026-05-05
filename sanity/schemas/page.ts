import { defineType, defineField } from "sanity"

export default defineType({
  name: "page",
  title: "Side",
  type: "document",
  fields: [
    defineField({ name: "title_da", title: "Titel (dansk)", type: "string" }),
    defineField({ name: "title_en", title: "Titel (engelsk)", type: "string" }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      validation: (Rule) => Rule.required(),
      options: { source: "title_da" },
    }),
    defineField({
      name: "body_da",
      title: "Indhold (dansk)",
      type: "array",
      of: [{ type: "block" }],
    }),
    defineField({
      name: "body_en",
      title: "Indhold (engelsk)",
      type: "array",
      of: [{ type: "block" }],
    }),
    defineField({ name: "seoTitle_da", title: "SEO-titel (dansk)", type: "string" }),
    defineField({ name: "seoTitle_en", title: "SEO-titel (engelsk)", type: "string" }),
    defineField({ name: "seoDescription_da", title: "SEO-beskrivelse (dansk)", type: "string" }),
    defineField({ name: "seoDescription_en", title: "SEO-beskrivelse (engelsk)", type: "string" }),
  ],
})
