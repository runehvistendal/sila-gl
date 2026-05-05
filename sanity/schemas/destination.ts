import { defineType, defineField } from "sanity"

export default defineType({
  name: "destination",
  title: "Destination",
  type: "document",
  fields: [
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      validation: (Rule) => Rule.required(),
      options: { source: "name" },
    }),
    defineField({ name: "name", title: "Navn", type: "string" }),
    defineField({ name: "description_da", title: "Beskrivelse (dansk)", type: "text" }),
    defineField({ name: "description_en", title: "Beskrivelse (engelsk)", type: "text" }),
    defineField({ name: "description_kl", title: "Beskrivelse (grønlandsk)", type: "text" }),
    defineField({
      name: "heroImage",
      title: "Hero-billede",
      type: "image",
      options: { hotspot: true },
      fields: [
        defineField({ name: "alt", title: "Alt-tekst", type: "string" }),
      ],
    }),
    defineField({ name: "seoTitle_da", title: "SEO-titel (dansk)", type: "string" }),
    defineField({ name: "seoTitle_en", title: "SEO-titel (engelsk)", type: "string" }),
    defineField({ name: "seoTitle_kl", title: "SEO-titel (grønlandsk)", type: "string" }),
    defineField({ name: "seoDescription_da", title: "SEO-beskrivelse (dansk)", type: "string" }),
    defineField({ name: "seoDescription_en", title: "SEO-beskrivelse (engelsk)", type: "string" }),
    defineField({ name: "seoDescription_kl", title: "SEO-beskrivelse (grønlandsk)", type: "string" }),
    defineField({
      name: "sections",
      title: "Sektioner",
      type: "array",
      of: [
        { type: "heroSection" },
        { type: "textImageSection" },
        { type: "faqSection" },
        { type: "ctaSection" },
        { type: "imageGallerySection" },
      ],
    }),
  ],
})
