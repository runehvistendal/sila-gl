import Image from "next/image"
import { sanityImage } from "@/lib/sanity"
import SanityCtaLink from "@/components/sanity/sanityHref"
import type { Locale } from "@/i18n/routing"

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
  locale: Locale
}

export default function HeroSectionBlock({ data, locale }: Props) {
  const heading = data[`heading_${locale}`] ?? data.heading_da
  const subheading = data[`subheading_${locale}`] ?? data.subheading_da
  const ctaLabel = data[`ctaLabel_${locale}`] ?? data.ctaLabel_da
  const imgUrl = data.image ? sanityImage(data.image).width(1600).url() : null

  return (
    <section className="relative min-h-[60vh] flex items-center justify-center text-white">
      {imgUrl ? (
        <Image src={imgUrl} alt={heading ?? ""} fill className="object-cover z-0" priority sizes="100vw" />
      ) : null}
      <div className="absolute inset-0 bg-black/40 z-[1]" aria-hidden />
      <div className="relative z-[2] text-center px-4 max-w-2xl mx-auto">
        {heading ? <h1 className="text-4xl md:text-5xl font-bold mb-4">{heading}</h1> : null}
        {subheading ? <p className="text-lg md:text-xl mb-8 opacity-90">{subheading}</p> : null}
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
