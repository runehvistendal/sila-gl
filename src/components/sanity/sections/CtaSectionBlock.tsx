import SanityCtaLink from "@/components/sanity/sanityHref"
import type { Locale } from "@/i18n/routing"

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
  locale: Locale
}

export default function CtaSectionBlock({ data, locale }: Props) {
  const heading = data[`heading_${locale}`] ?? data.heading_da
  const body = data[`body_${locale}`] ?? data.body_da
  const ctaLabel = data[`ctaLabel_${locale}`] ?? data.ctaLabel_da

  return (
    <section className="py-16 px-4">
      <div className="max-w-2xl mx-auto text-center bg-[#09192A] text-white rounded-2xl p-10">
        {heading ? <h2 className="text-2xl md:text-3xl font-bold mb-4">{heading}</h2> : null}
        {body ? <p className="text-lg opacity-80 mb-8">{body}</p> : null}
        {ctaLabel && data.ctaHref ? (
          <SanityCtaLink
            href={data.ctaHref}
            className="inline-block bg-[#4A9CC7] hover:bg-[#3a8ab5] text-white px-8 py-3 rounded-lg font-medium transition-colors"
          >
            {ctaLabel}
          </SanityCtaLink>
        ) : null}
      </div>
    </section>
  )
}
