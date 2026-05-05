import { defineType, defineField } from "sanity"

export default defineType({
  name: "homePage",
  title: "Forside",
  type: "document",
  fields: [
    defineField({ name: "badge", title: "Badge-tekst", type: "string" }),
    defineField({ name: "headline_da", title: "Overskrift (dansk)", type: "string" }),
    defineField({ name: "headline_en", title: "Overskrift (engelsk)", type: "string" }),
    defineField({ name: "subheadline_da", title: "Underoverskrift (dansk)", type: "string" }),
    defineField({ name: "subheadline_en", title: "Underoverskrift (engelsk)", type: "string" }),
  ],
})
