import { defineType, defineField } from "sanity"

export default defineType({
  name: "post",
  title: "Blogindlæg",
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
    defineField({ name: "publishedAt", title: "Udgivet", type: "datetime" }),
    defineField({ name: "excerpt_da", title: "Uddrag (dansk)", type: "text" }),
    defineField({ name: "excerpt_en", title: "Uddrag (engelsk)", type: "text" }),
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
    defineField({
      name: "coverImage",
      title: "Forsidebillede",
      type: "image",
      options: { hotspot: true },
      fields: [
        defineField({ name: "alt", title: "Alt-tekst", type: "string" }),
      ],
    }),
    defineField({ name: "seoTitle_da", title: "SEO-titel (dansk)", type: "string" }),
    defineField({ name: "seoTitle_en", title: "SEO-titel (engelsk)", type: "string" }),
    defineField({ name: "seoDescription_da", title: "SEO-beskrivelse (dansk)", type: "string" }),
    defineField({ name: "seoDescription_en", title: "SEO-beskrivelse (engelsk)", type: "string" }),
  ],
})
