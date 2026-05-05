"use client"

import { useState } from "react"
import type { Locale } from "@/i18n/routing"

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
  locale: Locale
}

export default function FaqSectionBlock({ data, locale }: Props) {
  const heading = data[`heading_${locale}`] ?? data.heading_da
  const items = (data.items ?? []) as Record<string, string | undefined>[]
  const [open, setOpen] = useState<number | null>(null)

  return (
    <section className="py-16 px-4 bg-[#E8F4F8]">
      <div className="max-w-3xl mx-auto">
        {heading ? (
          <h2 className="text-2xl md:text-3xl font-bold text-[#09192A] mb-8 text-center">{heading}</h2>
        ) : null}
        <div className="space-y-3">
          {items.map((item, i) => {
            const q = item[`question_${locale}`] ?? item.question_da
            const a = item[`answer_${locale}`] ?? item.answer_da
            return (
              <div key={item._key ?? i} className="bg-white rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpen(open === i ? null : i)}
                  className="w-full text-left px-6 py-4 font-medium text-[#09192A] flex justify-between items-center gap-4"
                >
                  <span>{q}</span>
                  <span className="shrink-0 text-[#4A9CC7]">{open === i ? "−" : "+"}</span>
                </button>
                {open === i && a ? <div className="px-6 pb-4 text-gray-600 whitespace-pre-wrap">{a}</div> : null}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
