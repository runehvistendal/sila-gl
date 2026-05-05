import { defineType, defineField } from "sanity"

export default defineType({
  name: "globalSettings",
  title: "Globale indstillinger",
  type: "document",
  fields: [
    defineField({ name: "footerTagline_da", title: "Footer-tagline (dansk)", type: "string" }),
    defineField({ name: "footerTagline_en", title: "Footer-tagline (engelsk)", type: "string" }),
    defineField({ name: "footerTagline_kl", title: "Footer-tagline (grønlandsk)", type: "string" }),
    defineField({ name: "contactEmail", title: "Kontakt-e-mail", type: "string" }),
    defineField({ name: "cvr", title: "CVR-nummer", type: "string" }),
  ],
})
