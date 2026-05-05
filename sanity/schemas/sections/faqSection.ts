import { defineType, defineField } from "sanity"

export default defineType({
  name: "faqSection",
  title: "FAQ",
  type: "object",
  fields: [
    defineField({ name: "heading_da", type: "string", title: "Overskrift (DA)" }),
    defineField({ name: "heading_en", type: "string", title: "Heading (EN)" }),
    defineField({
      name: "items",
      title: "Spørgsmål",
      type: "array",
      of: [
        {
          type: "object",
          fields: [
            defineField({ name: "question_da", type: "string", title: "Spørgsmål (DA)" }),
            defineField({ name: "question_en", type: "string", title: "Question (EN)" }),
            defineField({ name: "answer_da", type: "text", title: "Svar (DA)" }),
            defineField({ name: "answer_en", type: "text", title: "Answer (EN)" }),
          ],
          preview: { select: { title: "question_da" } },
        },
      ],
    }),
  ],
  preview: {
    select: { title: "heading_da" },
    prepare: ({ title }) => ({ title: `FAQ: ${title ?? "–"}` }),
  },
})
